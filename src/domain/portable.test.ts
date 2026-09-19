import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';
import { buildExport, parseImport, pickNewer, splitOutlines, toMarkdown } from './portable';
import { createTree } from './tree';
import type { ReviewLog } from './types';

const tree = () => createTree(parseOutline('根\n  枝\n    葉')!, '2026-09-01T00:00:00.000Z');
const log = (treeId: string): ReviewLog => ({
  id: 'log1',
  treeId,
  date: '2026-09-10',
  ratio: 0.5,
  missedNodeIds: ['x'],
});

describe('buildExport と parseImport', () => {
  it('書き出したものをそのまま読み込める', () => {
    const t = tree();
    const file = buildExport([t], [log(t.id)], '2026-09-19');
    expect(file.app).toBe('kozo');
    expect(file.version).toBe(1);
    expect(file.exportedAt).toBe('2026-09-19');

    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.trees).toEqual([t]);
    expect(parsed.reviewLogs).toEqual([log(t.id)]);
  });

  it('JSON でないもの、別のアプリのもの、知らない版は断る', () => {
    expect(() => parseImport('これは JSON ではない')).toThrow();
    expect(() => parseImport(JSON.stringify({ app: 'other', version: 1, trees: [] }))).toThrow();
    expect(() => parseImport(JSON.stringify({ app: 'kozo', version: 2, trees: [] }))).toThrow();
  });

  it('形の壊れた木は断る', () => {
    const t = tree();
    const broken = { ...t, root: { ...t.root, children: [{ id: 'a', text: 1 }] } };
    const file = { app: 'kozo', version: 1, exportedAt: '2026-09-19', trees: [broken] };
    expect(() => parseImport(JSON.stringify(file))).toThrow();
  });

  it('reviewLogs がなくても読み込める', () => {
    const file = { app: 'kozo', version: 1, exportedAt: '2026-09-19', trees: [tree()] };
    expect(parseImport(JSON.stringify(file)).reviewLogs).toEqual([]);
  });
});

describe('pickNewer', () => {
  it('手元にない木は入れ、同じ id の木は新しい方だけ入れる', () => {
    const mine = { ...tree(), id: 'same', updatedAt: '2026-09-10T00:00:00.000Z' };
    const older = { ...mine, updatedAt: '2026-09-05T00:00:00.000Z' };
    const newer = { ...mine, updatedAt: '2026-09-15T00:00:00.000Z' };
    const other = { ...tree(), id: 'other' };

    expect(pickNewer([mine], [older, other]).map((t) => t.id)).toEqual(['other']);
    expect(pickNewer([mine], [newer])).toEqual([newer]);
  });
});

describe('toMarkdown', () => {
  it('入れ子の箇条書きにし、そのまま parseOutline で読み戻せる', () => {
    const root = parseOutline('根\n  枝\n    葉\n  枝2')!;
    const md = toMarkdown(root);
    expect(md).toBe('- 根\n  - 枝\n    - 葉\n  - 枝2');
    const again = parseOutline(md)!;
    expect(again.children.map((c) => c.text)).toEqual(['枝', '枝2']);
    expect(again.children[0].children[0].text).toBe('葉');
  });
});

describe('splitOutlines', () => {
  it('字下げも記号もない行を見出しとして、木ごとに切り分ける', () => {
    const text = [
      '人権の三要素',
      '- 固有性',
      '  - 生来の権利',
      '',
      '違憲審査基準',
      '\t厳格審査',
      '\t中間審査',
    ].join('\n');
    const chunks = splitOutlines(text);
    expect(chunks).toHaveLength(2);
    const [first, second] = chunks.map((c) => parseOutline(c)!);
    expect(first.text).toBe('人権の三要素');
    expect(first.children[0].children[0].text).toBe('生来の権利');
    expect(second.text).toBe('違憲審査基準');
    expect(second.children.map((c) => c.text)).toEqual(['厳格審査', '中間審査']);
  });

  it('先頭が記号つきの行でも1本目の木として扱う', () => {
    const chunks = splitOutlines('- 根\n  - 枝\n次の根\n  枝');
    expect(chunks.map((c) => parseOutline(c)!.text)).toEqual(['根', '次の根']);
  });

  it('中身がなければ空', () => {
    expect(splitOutlines(' \n\n')).toEqual([]);
  });
});
