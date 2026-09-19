import { describe, expect, it } from 'vitest';
import { docToOutlines, parseDocId, planSync, type GoogleDoc } from './gdoc';
import { parseOutline, toOutline } from './outline';
import { createTree } from './tree';
import type { Tree } from './types';

// 段落内の改行（Shift+Enter）は縦タブで届く
const SOFT_BREAK = String.fromCharCode(0x0b);

const para = (text: string, level?: number, style = 'NORMAL_TEXT') => ({
  paragraph: {
    elements: [{ textRun: { content: `${text}\n` } }],
    paragraphStyle: { namedStyleType: style },
    ...(level === undefined ? {} : { bullet: { listId: 'l', nestingLevel: level || undefined } }),
  },
});

const DOC: GoogleDoc = {
  title: '憲法ノート',
  body: {
    content: [
      { sectionBreak: {} },
      para('憲法ノート', undefined, 'TITLE'),
      para('人権の三要素', undefined, 'HEADING_2'),
      para('固有性', 0),
      para('生来の権利', 1),
      para('不可侵性', 0),
      para(''),
      para('違憲審査基準'),
      para('厳格審査', 0),
    ],
  },
};

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

describe('docToOutlines', () => {
  it('箇条書きでない段落を見出しに、箇条書きを段の深さどおりの節にする', () => {
    expect(docToOutlines(DOC)).toEqual([
      '人権の三要素\n  固有性\n    生来の権利\n  不可侵性',
      '違憲審査基準\n  厳格審査',
    ]);
  });

  it('文書の題名と空の段落は木にしない', () => {
    const roots = docToOutlines(DOC).map((o) => parseOutline(o)!.text);
    expect(roots).not.toContain('憲法ノート');
  });

  it('段落内の改行は空白にし、分かれた文字列はつなぐ', () => {
    const doc: GoogleDoc = {
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: '見出し' } }, { textRun: { content: 'の続き\n' } }],
            },
          },
          {
            paragraph: {
              elements: [{ textRun: { content: `一行目${SOFT_BREAK}二行目\n` } }],
              bullet: { listId: 'l' },
            },
          },
        ],
      },
    };
    expect(docToOutlines(doc)).toEqual(['見出しの続き\n  一行目 二行目']);
  });

  it('見出しより前の箇条書きは、最初の行を根にする', () => {
    const doc: GoogleDoc = { body: { content: [para('根', 0), para('枝', 1)] } };
    expect(docToOutlines(doc)).toEqual(['根\n    枝']);
  });
});

describe('planSync', () => {
  const NOW = '2026-09-19T00:00:00.000Z';
  const DOC_ID = 'doc1';
  const synced = (outline: string, docId = DOC_ID): Tree => ({
    ...createTree(parseOutline(outline)!, '2026-09-01T00:00:00.000Z'),
    source: { kind: 'gdoc', docId },
  });

  it('新しい見出しは新しい木にして、出どころを記録する', () => {
    const plan = planSync([], DOC_ID, ['根\n  枝'], NOW);
    expect(plan.created).toBe(1);
    expect(plan.put).toHaveLength(1);
    expect(plan.put[0].source).toEqual({ kind: 'gdoc', docId: DOC_ID });
    expect(plan.put[0].srs.due).toBeNull();
  });

  it('同じ文書の同じ見出しは中身を更新し、記録を引き継ぐ', () => {
    const tree = synced('根\n  枝A\n  枝B');
    tree.root.children[0].missCount = 3;
    tree.srs = { ...tree.srs, due: '2026-09-25', reps: 2, interval: 6 };

    const plan = planSync([tree], DOC_ID, ['根\n  枝A\n  枝C'], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 1, unchanged: 0 });
    const next = plan.put[0];
    expect(next.id).toBe(tree.id);
    expect(next.srs).toEqual(tree.srs);
    expect(next.updatedAt).toBe(NOW);
    expect(toOutline(next.root)).toBe('根\n  枝A\n  枝C');
    expect(next.root.children[0].missCount).toBe(3);
  });

  it('中身が同じなら何も書き込まない', () => {
    const plan = planSync([synced('根\n  枝')], DOC_ID, ['根\n  枝'], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(plan.put).toEqual([]);
  });

  it('別の文書の木や、手で作った木は同じ見出しでも触らない', () => {
    const manual = createTree(parseOutline('根\n  手書き')!, NOW);
    const other = synced('根\n  別の文書', 'doc2');
    const plan = planSync([manual, other], DOC_ID, ['根\n  枝'], NOW);
    expect(plan.created).toBe(1);
    expect(plan.put[0].id).not.toBe(manual.id);
    expect(plan.put[0].id).not.toBe(other.id);
  });

  it('文書から消えた見出しの木は残す', () => {
    const plan = planSync([synced('消えた根\n  枝')], DOC_ID, [], NOW);
    expect(plan.put).toEqual([]);
  });

  it('同じ見出しが2つあれば上から順に対応づける', () => {
    const first = synced('根\n  一');
    const second = synced('根\n  二');
    const plan = planSync([first, second], DOC_ID, ['根\n  一', '根\n  二改'], NOW);
    expect(plan).toMatchObject({ created: 0, updated: 1, unchanged: 1 });
    expect(plan.put[0].id).toBe(second.id);
  });
});
