import { describe, expect, it } from 'vitest';
import { docToTrees, parseDocId, planSync, type DocTree, type GoogleDocBody } from './gdoc';
import { parseOutline, toOutline } from './outline';
import { createTree } from './tree';
import type { Tree } from './types';

// 段落内の改行（Shift+Enter）は縦タブで届く
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
  it('URL からも、id そのものからも取り出す', () => {
    const id = '1AbC_def-GHI234567890jklmnopqrstu';
    expect(parseDocId(`https://docs.google.com/document/d/${id}/edit?tab=t.0`)).toBe(id);
    expect(parseDocId(` ${id} `)).toBe(id);
  });

  it('文書の URL でなければ null', () => {
    expect(parseDocId('')).toBeNull();
    expect(parseDocId('https://example.com/foo')).toBeNull();
    expect(parseDocId('短い')).toBeNull();
  });
});

describe('docToTrees', () => {
  it('箇条書きの直前の見出しを根に、箇条書きを段の深さどおりの節にする', () => {
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
      // 普通の段落は H1 より下の段なので、H1 が場所になる
      { path: ['人権の三要素'], outline: '違憲審査基準\n  厳格審査' },
    ]);
  });

  it('下に箇条書きのない見出しは木にせず、場所として添える', () => {
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

  it('すべてのタブを読み、タブ名を場所の先頭に置く', () => {
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

  it('タブが1つだけならタブ名は場所に含めない', () => {
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

  it('段落内の改行は空白にし、分かれた文字列はつなぐ', () => {
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

  it('見出しより前の箇条書きは、最初の行を根にする', () => {
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
  const synced = (outline: string, path: string[] = [], docId = DOC_ID): Tree => ({
    ...createTree(parseOutline(outline)!, '2026-09-01T00:00:00.000Z'),
    source: { kind: 'gdoc', docId, path },
  });

  it('新しい見出しは新しい木にして、出どころと場所を記録する', () => {
    const plan = planSync([], DOC_ID, [docTree('根\n  枝', ['憲法'])], NOW);
    expect(plan.created).toBe(1);
    expect(plan.put[0].source).toEqual({ kind: 'gdoc', docId: DOC_ID, path: ['憲法'] });
    expect(plan.put[0].srs.due).toBeNull();
  });

  it('同じ場所の同じ見出しは中身を更新し、記録を引き継ぐ', () => {
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

  it('中身も場所も同じなら何も書き込まない', () => {
    const existing = [synced('根\n  枝', ['憲法'])];
    const plan = planSync(existing, DOC_ID, [docTree('根\n  枝', ['憲法'])], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(plan.put).toEqual([]);
  });

  it('同じ見出しでも場所が違えば別の木として対応づける', () => {
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

  it('場所の名前だけ変わった木は、重複させずに場所を更新する', () => {
    const tree = synced('人権\n  固有性', ['憲法']);
    tree.root.children[0].missCount = 2;
    const plan = planSync([tree], DOC_ID, [docTree('人権\n  固有性', ['憲法（芦部）'])], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 1 });
    expect(plan.put[0].id).toBe(tree.id);
    expect(plan.put[0].source?.path).toEqual(['憲法（芦部）']);
    expect(plan.put[0].root.children[0].missCount).toBe(2);
  });

  it('場所が変わり、同じ見出しが複数あって決められないときは新しい木にする', () => {
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

  it('場所が変わっても、中身がそっくり同じ木は同じ木とみなす', () => {
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

  it('別の文書の木や、手で作った木は同じ見出しでも触らない', () => {
    const manual = createTree(parseOutline('根\n  手書き')!, NOW);
    const other = synced('根\n  別の文書', [], 'doc2');
    const plan = planSync([manual, other], DOC_ID, [docTree('根\n  枝')], NOW);
    expect(plan.created).toBe(1);
    expect(plan.put[0].id).not.toBe(manual.id);
    expect(plan.put[0].id).not.toBe(other.id);
  });

  it('文書から消えた見出しの木は残す', () => {
    expect(planSync([synced('消えた根\n  枝')], DOC_ID, [], NOW).put).toEqual([]);
  });
});
