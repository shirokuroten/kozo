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

describe('buildExport and parseImport', () => {
  it('imports an export as is', () => {
    const t = tree();
    const file = buildExport([t], [log(t.id)], '2026-09-19');
    expect(file.app).toBe('kozo');
    expect(file.version).toBe(1);
    expect(file.exportedAt).toBe('2026-09-19');

    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.trees).toEqual([t]);
    expect(parsed.reviewLogs).toEqual([log(t.id)]);
  });

  it('rejects non-JSON input, files from another app, and unknown versions', () => {
    expect(() => parseImport('これは JSON ではない')).toThrow();
    expect(() => parseImport(JSON.stringify({ app: 'other', version: 1, trees: [] }))).toThrow();
    expect(() => parseImport(JSON.stringify({ app: 'kozo', version: 2, trees: [] }))).toThrow();
  });

  it('rejects trees with a broken shape', () => {
    const t = tree();
    const broken = { ...t, root: { ...t.root, children: [{ id: 'a', text: 1 }] } };
    const file = { app: 'kozo', version: 1, exportedAt: '2026-09-19', trees: [broken] };
    expect(() => parseImport(JSON.stringify(file))).toThrow();
  });

  it('imports even when reviewLogs is absent', () => {
    const file = { app: 'kozo', version: 1, exportedAt: '2026-09-19', trees: [tree()] };
    expect(parseImport(JSON.stringify(file)).reviewLogs).toEqual([]);
  });
});

describe('pickNewer', () => {
  it('takes trees not present locally, and for trees with the same id takes only the newer one', () => {
    const mine = { ...tree(), id: 'same', updatedAt: '2026-09-10T00:00:00.000Z' };
    const older = { ...mine, updatedAt: '2026-09-05T00:00:00.000Z' };
    const newer = { ...mine, updatedAt: '2026-09-15T00:00:00.000Z' };
    const other = { ...tree(), id: 'other' };

    expect(pickNewer([mine], [older, other]).map((t) => t.id)).toEqual(['other']);
    expect(pickNewer([mine], [newer])).toEqual([newer]);
  });
});

describe('toMarkdown', () => {
  it('produces a nested bullet list that parseOutline can read back as is', () => {
    const root = parseOutline('根\n  枝\n    葉\n  枝2')!;
    const md = toMarkdown(root);
    expect(md).toBe('- 根\n  - 枝\n    - 葉\n  - 枝2');
    const again = parseOutline(md)!;
    expect(again.children.map((c) => c.text)).toEqual(['枝', '枝2']);
    expect(again.children[0].children[0].text).toBe('葉');
  });
});

describe('splitOutlines', () => {
  it('splits into trees, treating lines with neither indentation nor a bullet marker as headings', () => {
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

  it('treats the first line as the first tree even when it has a bullet marker', () => {
    const chunks = splitOutlines('- 根\n  - 枝\n次の根\n  枝');
    expect(chunks.map((c) => parseOutline(c)!.text)).toEqual(['根', '次の根']);
  });

  it('returns an empty array when there is no content', () => {
    expect(splitOutlines(' \n\n')).toEqual([]);
  });
});
