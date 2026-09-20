import { describe, expect, it } from 'vitest';
import { docToTrees, parseDocId, planSync, type DocTree, type GoogleDocBody } from './gdoc';
import { parseOutline, toOutline } from './outline';
import { createTree } from './tree';
import type { Tree } from './types';

// A line break inside a paragraph (Shift+Enter) arrives as a vertical tab
const SOFT_BREAK = String.fromCharCode(0x0b);

const para = (text: string, style = 'NORMAL_TEXT') => ({
  paragraph: {
    elements: [{ textRun: { content: `${text}\n` } }],
    paragraphStyle: { namedStyleType: style },
  },
});
const bullet = (text: string, level = 0) => ({
  paragraph: {
    elements: [{ textRun: { content: `${text}\n` } }],
    bullet: { listId: 'l', ...(level > 0 ? { nestingLevel: level } : {}) },
  },
});
const body = (...content: NonNullable<GoogleDocBody['content']>): GoogleDocBody => ({ content });

describe('parseDocId', () => {
  it('extracts the id from a URL as well as from the id itself', () => {
    const id = '1AbC_def-GHI234567890jklmnopqrstu';
    expect(parseDocId(`https://docs.google.com/document/d/${id}/edit?tab=t.0`)).toBe(id);
    expect(parseDocId(` ${id} `)).toBe(id);
  });

  it('returns null for anything that is not a document URL', () => {
    expect(parseDocId('')).toBeNull();
    expect(parseDocId('https://example.com/foo')).toBeNull();
    expect(parseDocId('短い')).toBeNull();
  });
});

describe('docToTrees', () => {
  it('makes the heading right before a bullet list the root, and the bullets nodes at their nesting depth', () => {
    const doc = {
      body: body(
        { sectionBreak: {} },
        para('憲法ノート', 'TITLE'),
        para('人権の三要素', 'HEADING_1'),
        bullet('固有性'),
        bullet('生来の権利', 1),
        bullet('不可侵性'),
        para(''),
        para('違憲審査基準'),
        bullet('厳格審査'),
      ),
    };
    expect(docToTrees(doc)).toEqual([
      { path: [], outline: '人権の三要素\n  固有性\n    生来の権利\n  不可侵性' },
      // A plain paragraph is a level below H1, so H1 becomes the location
      { path: ['人権の三要素'], outline: '違憲審査基準\n  厳格審査' },
    ]);
  });

  it('does not make a tree from a heading with no bullet list below it, and attaches it as the location', () => {
    const doc = {
      body: body(
        para('第2章 物権', 'HEADING_1'),
        para('即時取得', 'HEADING_2'),
        para('要件', 'HEADING_3'),
        bullet('動産'),
        para('効果', 'HEADING_3'),
        bullet('原始取得'),
        para('第3章 債権', 'HEADING_1'),
        para('ここは覚え書きの文章で、箇条書きが続かない'),
        para('要件', 'HEADING_2'),
        bullet('別の要件'),
      ),
    };
    expect(docToTrees(doc)).toEqual([
      { path: ['第2章 物権', '即時取得'], outline: '要件\n  動産' },
      { path: ['第2章 物権', '即時取得'], outline: '効果\n  原始取得' },
      { path: ['第3章 債権'], outline: '要件\n  別の要件' },
    ]);
  });

  it('reads every tab and puts the tab name at the start of the location', () => {
    const doc = {
      title: 'ノート',
      tabs: [
        {
          tabProperties: { title: '憲法' },
          documentTab: { body: body(para('人権', 'HEADING_1'), bullet('固有性')) },
          childTabs: [
            {
              tabProperties: { title: '統治' },
              documentTab: { body: body(para('国会'), bullet('唯一の立法機関')) },
            },
          ],
        },
        {
          tabProperties: { title: '民法' },
          documentTab: { body: body(para('物権'), bullet('排他性')) },
        },
      ],
    };
    expect(docToTrees(doc)).toEqual([
      { path: ['憲法'], outline: '人権\n  固有性' },
      { path: ['憲法', '統治'], outline: '国会\n  唯一の立法機関' },
      { path: ['民法'], outline: '物権\n  排他性' },
    ]);
  });

  it('leaves the tab name out of the location when there is only one tab', () => {
    const doc = {
      tabs: [
        {
          tabProperties: { title: 'タブ 1' },
          documentTab: { body: body(para('根'), bullet('枝')) },
        },
      ],
    };
    expect(docToTrees(doc)).toEqual([{ path: [], outline: '根\n  枝' }]);
  });

  it('turns line breaks inside a paragraph into spaces and joins split text runs', () => {
    const doc = {
      body: body(
        {
          paragraph: {
            elements: [{ textRun: { content: '見出し' } }, { textRun: { content: 'の続き\n' } }],
          },
        },
        bullet(`一行目${SOFT_BREAK}二行目`),
      ),
    };
    expect(docToTrees(doc)).toEqual([{ path: [], outline: '見出しの続き\n  一行目 二行目' }]);
  });

  it('makes the first line the root for a bullet list that comes before any heading', () => {
    const [tree] = docToTrees({ body: body(bullet('根'), bullet('枝', 1), bullet('枝2', 1)) });
    const root = parseOutline(tree.outline)!;
    expect(root.text).toBe('根');
    expect(root.children.map((c) => c.text)).toEqual(['枝', '枝2']);
  });
});

describe('planSync', () => {
  const NOW = '2026-09-19T00:00:00.000Z';
  const DOC_ID = 'doc1';
  const docTree = (outline: string, path: string[] = []): DocTree => ({ path, outline });
  const synced = (outline: string, path: string[] = [], docId = DOC_ID, order = 0): Tree => ({
    ...createTree(parseOutline(outline)!, '2026-09-01T00:00:00.000Z'),
    source: { kind: 'gdoc', docId, docTitle: '', path, order },
  });

  it('makes a new tree for a new heading and records its source and location', () => {
    const plan = planSync([], DOC_ID, [docTree('根\n  枝', ['憲法'])], NOW);
    expect(plan.created).toBe(1);
    expect(plan.put[0].source).toEqual({
      kind: 'gdoc',
      docId: DOC_ID,
      docTitle: '',
      path: ['憲法'],
      order: 0,
    });
    expect(plan.put[0].srs.due).toBeNull();
  });

  it('updates the content and carries over stats for the same heading at the same location', () => {
    const tree = synced('根\n  枝A\n  枝B');
    tree.root.children[0].missCount = 3;
    tree.srs = { ...tree.srs, due: '2026-09-25', reps: 2, interval: 6 };

    const plan = planSync([tree], DOC_ID, [docTree('根\n  枝A\n  枝C')], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 1, unchanged: 0 });
    const next = plan.put[0];
    expect(next.id).toBe(tree.id);
    expect(next.srs).toEqual(tree.srs);
    expect(next.updatedAt).toBe(NOW);
    expect(toOutline(next.root)).toBe('根\n  枝A\n  枝C');
    expect(next.root.children[0].missCount).toBe(3);
  });

  it('writes nothing when both content and location are the same', () => {
    const existing = [synced('根\n  枝', ['憲法'])];
    const plan = planSync(existing, DOC_ID, [docTree('根\n  枝', ['憲法'])], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(plan.put).toEqual([]);
  });

  it('matches trees with the same heading as separate trees when their locations differ', () => {
    const a = synced('要件\n  動産', ['即時取得']);
    const b = synced('要件\n  占有', ['時効取得']);
    const plan = planSync(
      [a, b],
      DOC_ID,
      [docTree('要件\n  占有の継続', ['時効取得']), docTree('要件\n  動産', ['即時取得'])],
      NOW,
    );
    expect(plan).toMatchObject({ created: 0, updated: 1, unchanged: 1 });
    expect(plan.put[0].id).toBe(b.id);
  });

  it('updates the location without duplicating a tree when only the location name changed', () => {
    const tree = synced('人権\n  固有性', ['憲法']);
    tree.root.children[0].missCount = 2;
    const plan = planSync([tree], DOC_ID, [docTree('人権\n  固有性', ['憲法（芦部）'])], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 1 });
    expect(plan.put[0].id).toBe(tree.id);
    expect(plan.put[0].source?.path).toEqual(['憲法（芦部）']);
    expect(plan.put[0].root.children[0].missCount).toBe(2);
  });

  it('makes a new tree when the location changed and several trees share the heading so no match can be decided', () => {
    const a = synced('要件\n  一', ['旧A']);
    const b = synced('要件\n  二', ['旧B']);
    const plan = planSync(
      [a, b],
      DOC_ID,
      [docTree('要件\n  一改', ['新A']), docTree('要件\n  二改', ['新B'])],
      NOW,
    );
    expect(plan.created).toBe(2);
  });

  it('treats a tree with exactly the same content as the same tree even when the location changed', () => {
    const a = synced('要件\n  一', ['旧A']);
    const b = synced('要件\n  二', ['旧B']);
    const plan = planSync(
      [a, b],
      DOC_ID,
      [docTree('要件\n  二', ['新B']), docTree('要件\n  一', ['新A'])],
      NOW,
    );
    expect(plan).toMatchObject({ created: 0, updated: 2 });
    expect(plan.put.map((t) => t.id)).toEqual([b.id, a.id]);
  });

  it('does not touch trees from another document or trees made by hand, even with the same heading', () => {
    const manual = createTree(parseOutline('根\n  手書き')!, NOW);
    const other = synced('根\n  別の文書', [], 'doc2');
    const plan = planSync([manual, other], DOC_ID, [docTree('根\n  枝')], NOW);
    expect(plan.created).toBe(1);
    expect(plan.put[0].id).not.toBe(manual.id);
    expect(plan.put[0].id).not.toBe(other.id);
  });

  it('rewrites a tree whose order shifted because trees were added above, but does not count it as updated', () => {
    const tree = synced('根\n  枝');
    tree.srs = { ...tree.srs, due: '2026-09-25' };
    const incoming = [docTree('新しい根\n  枝'), docTree('根\n  枝')];
    const plan = planSync([tree], DOC_ID, incoming, NOW, '憲法');
    expect(plan).toMatchObject({ created: 1, updated: 0, unchanged: 1 });
    const moved = plan.put.find((t) => t.id === tree.id)!;
    expect(moved.source).toMatchObject({ order: 1, docTitle: '憲法' });
    expect(moved.srs).toEqual(tree.srs);
    expect(moved.root).toEqual(tree.root);
  });

  it('removes trees whose heading is gone from the document, but not trees from another document or trees made by hand', () => {
    const gone = synced('消えた根\n  枝');
    const kept = synced('残る根\n  枝');
    const other = synced('消えた根\n  枝', [], 'doc2');
    const manual = createTree(parseOutline('消えた根\n  枝')!, NOW);
    const plan = planSync([gone, kept, other, manual], DOC_ID, [docTree('残る根\n  枝')], NOW);
    expect(plan.remove.map((t) => t.id)).toEqual([gone.id]);
  });

  it('removes the old tree and makes a new one when heading and content changed at the same time', () => {
    const old = synced('旧い見出し\n  旧い枝');
    const plan = planSync([old], DOC_ID, [docTree('新しい見出し\n  新しい枝')], NOW);
    expect(plan.created).toBe(1);
    expect(plan.remove.map((t) => t.id)).toEqual([old.id]);
  });

  it('does not remove a tree whose location alone changed', () => {
    const tree = synced('人権\n  固有性', ['憲法']);
    const plan = planSync([tree], DOC_ID, [docTree('人権\n  固有性', ['憲法（芦部）'])], NOW);
    expect(plan.remove).toEqual([]);
  });

  it('removes nothing when not a single tree could be read from the document', () => {
    const plan = planSync([synced('根\n  枝')], DOC_ID, [], NOW);
    expect(plan.remove).toEqual([]);
    expect(plan.put).toEqual([]);
  });
});
