import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';
import { buildShelf, searchTrees, shelfPath, type ShelfGroup } from './shelf';
import { createTree } from './tree';
import type { Tree } from './types';

let clock = 0;
function manual(outline: string): Tree {
  clock += 1;
  return createTree(
    parseOutline(outline)!,
    `2026-09-01T00:00:${String(clock).padStart(2, '0')}.000Z`,
  );
}
function synced(outline: string, docTitle: string, path: string[], order: number): Tree {
  return { ...manual(outline), source: { kind: 'gdoc', docId: docTitle, docTitle, path, order } };
}

type Shape = { name: string; trees: string[]; groups: Shape[] };
const shape = (g: ShelfGroup): Shape => ({
  name: g.name,
  trees: g.trees.map((t) => t.root.text),
  groups: g.groups.map(shape),
});

describe('shelfPath', () => {
  it('lists document title, tab names, then headings, and is empty for trees made by hand', () => {
    expect(shelfPath(synced('根', '憲法', ['第1編', '第2章'], 0))).toEqual([
      '憲法',
      '第1編',
      '第2章',
    ]);
    expect(shelfPath(manual('根'))).toEqual([]);
  });
});

describe('buildShelf', () => {
  it('nests as document > tab > heading > tree, in the order within the document', () => {
    const trees = [
      synced('統治の木', '憲法', ['第2編 統治', '国会'], 2),
      manual('手書きの木'),
      synced('人権の木B', '憲法', ['第1編 人権', '総論'], 1),
      synced('物権の木', '民法', ['物権'], 0),
      synced('人権の木A', '憲法', ['第1編 人権', '総論'], 0),
    ];
    expect(shape(buildShelf(trees))).toEqual({
      name: '',
      trees: ['手書きの木'],
      groups: [
        {
          name: '憲法',
          trees: [],
          groups: [
            {
              name: '第1編 人権',
              trees: [],
              groups: [{ name: '総論', trees: ['人権の木A', '人権の木B'], groups: [] }],
            },
            {
              name: '第2編 統治',
              trees: [],
              groups: [{ name: '国会', trees: ['統治の木'], groups: [] }],
            },
          ],
        },
        { name: '民法', trees: [], groups: [{ name: '物権', trees: ['物権の木'], groups: [] }] },
      ],
    });
  });

  it('keeps groups and trees of one level in document order, not groups first', () => {
    // Chapter 2 has bullets right under its heading, so it is a tree. The other chapters have
    // sub-headings, so they are groups. The shelf must still read 1, 2, 3
    const shelf = buildShelf([
      synced('定義', '憲法', ['人権総論', '1. 分類'], 0),
      synced('2. 享有主体性', '憲法', ['人権総論'], 1),
      synced('公共の福祉', '憲法', ['人権総論', '3. 限界'], 2),
      synced('特別な法律関係', '憲法', ['人権総論', '3. 限界'], 3),
    ]);
    const part = shelf.groups[0].groups[0];
    expect(
      part.items.map((item) => (item.kind === 'group' ? item.group.name : item.tree.root.text)),
    ).toEqual(['1. 分類', '2. 享有主体性', '3. 限界']);
  });

  it('orders documents by registration order and puts unregistered documents last', () => {
    const trees = [
      synced('A', '憲法', [], 0),
      synced('B', '民法', [], 0),
      synced('C', '刑法', [], 0),
    ];
    const names = buildShelf(trees, ['民法', '憲法']).groups.map((g) => g.name);
    expect(names).toEqual(['民法', '憲法', '刑法']);
  });

  it('gives each group the number of trees below it and a unique key', () => {
    const shelf = buildShelf([
      synced('A', '憲法', ['第1編'], 0),
      synced('B', '憲法', ['第1編'], 1),
      synced('C', '憲法', ['第2編'], 2),
      // Tabs with the same name in different documents do not get mixed
      synced('D', '民法', ['第1編'], 0),
    ]);
    const [kenpo, minpo] = shelf.groups;
    expect(shelf.count).toBe(4);
    expect(kenpo.count).toBe(3);
    expect(kenpo.groups.map((g) => g.count)).toEqual([2, 1]);
    expect(kenpo.groups[0].key).not.toBe(minpo.groups[0].key);
  });

  it('groups older synced trees that have no document title under an untitled document', () => {
    const tree: Tree = { ...manual('根'), source: { kind: 'gdoc', docId: 'd', path: ['章'] } };
    expect(shape(buildShelf([tree])).groups[0].name).toBe('Untitled document');
  });
});

describe('searchTrees', () => {
  const trees = [
    synced('要件\n  動産であること\n  平穏、公然', '民法', ['物権', '即時取得'], 0),
    synced('効果\n  原始取得', '民法', ['物権', '即時取得'], 1),
    manual('人権の三要素\n  固有性\n    生来の権利\n  不可侵性'),
  ];

  it('finds a term whether it is in the root, a node, or the location', () => {
    expect(searchTrees(trees, '原始').map((h) => h.tree.root.text)).toEqual(['効果']);
    expect(searchTrees(trees, '三要素').map((h) => h.tree.root.text)).toEqual(['人権の三要素']);
    expect(searchTrees(trees, '即時取得').map((h) => h.tree.root.text)).toEqual(['要件', '効果']);
  });

  it('keeps only trees that contain every whitespace-separated term', () => {
    expect(searchTrees(trees, '即時取得 動産').map((h) => h.tree.root.text)).toEqual(['要件']);
    expect(searchTrees(trees, '即時取得　原始').map((h) => h.tree.root.text)).toEqual(['効果']);
    expect(searchTrees(trees, '動産 原始')).toEqual([]);
  });

  it('returns the nodes a term matched, with the trail from their parents', () => {
    const [hit] = searchTrees(trees, '生来');
    expect(hit.matches).toEqual([['固有性', '生来の権利']]);
    // When only the location matches, the list of nodes is empty
    expect(searchTrees(trees, '物権')[0].matches).toEqual([]);
  });

  it('ignores full-width vs half-width and upper vs lower case differences', () => {
    const t = [manual('ＬＲＡの基準\n  より制限的でない他の手段')];
    expect(searchTrees(t, 'lra')).toHaveLength(1);
  });

  it('returns nothing for an empty query', () => {
    expect(searchTrees(trees, '  ')).toEqual([]);
  });
});
