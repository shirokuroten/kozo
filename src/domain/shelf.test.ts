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
  it('文書名、タブ名、見出しの順に並べる。手で作った木は空', () => {
    expect(shelfPath(synced('根', '憲法', ['第1編', '第2章'], 0))).toEqual([
      '憲法',
      '第1編',
      '第2章',
    ]);
    expect(shelfPath(manual('根'))).toEqual([]);
  });
});

describe('buildShelf', () => {
  it('文書 > タブ > 見出し > 木 の入れ子にし、文書の中の順番どおりに並べる', () => {
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

  it('まとまりごとに、下にある木の本数と一意なキーを持つ', () => {
    const shelf = buildShelf([
      synced('A', '憲法', ['第1編'], 0),
      synced('B', '憲法', ['第1編'], 1),
      synced('C', '憲法', ['第2編'], 2),
      // 別の文書に同じ名前のタブがあっても混ざらない
      synced('D', '民法', ['第1編'], 0),
    ]);
    const [kenpo, minpo] = shelf.groups;
    expect(shelf.count).toBe(4);
    expect(kenpo.count).toBe(3);
    expect(kenpo.groups.map((g) => g.count)).toEqual([2, 1]);
    expect(kenpo.groups[0].key).not.toBe(minpo.groups[0].key);
  });

  it('文書名のない古い同期の木は、名前のない文書としてまとめる', () => {
    const tree: Tree = { ...manual('根'), source: { kind: 'gdoc', docId: 'd', path: ['章'] } };
    expect(shape(buildShelf([tree])).groups[0].name).toBe('無題の文書');
  });
});

describe('searchTrees', () => {
  const trees = [
    synced('要件\n  動産であること\n  平穏、公然', '民法', ['物権', '即時取得'], 0),
    synced('効果\n  原始取得', '民法', ['物権', '即時取得'], 1),
    manual('人権の三要素\n  固有性\n    生来の権利\n  不可侵性'),
  ];

  it('根、節、場所のどこに語があっても見つける', () => {
    expect(searchTrees(trees, '原始').map((h) => h.tree.root.text)).toEqual(['効果']);
    expect(searchTrees(trees, '三要素').map((h) => h.tree.root.text)).toEqual(['人権の三要素']);
    expect(searchTrees(trees, '即時取得').map((h) => h.tree.root.text)).toEqual(['要件', '効果']);
  });

  it('空白で区切った語はすべて含む木だけにする', () => {
    expect(searchTrees(trees, '即時取得 動産').map((h) => h.tree.root.text)).toEqual(['要件']);
    expect(searchTrees(trees, '即時取得　原始').map((h) => h.tree.root.text)).toEqual(['効果']);
    expect(searchTrees(trees, '動産 原始')).toEqual([]);
  });

  it('語が当たった節を、親からの道筋つきで返す', () => {
    const [hit] = searchTrees(trees, '生来');
    expect(hit.matches).toEqual([['固有性', '生来の権利']]);
    // 場所にしか当たらなければ、節の一覧は空
    expect(searchTrees(trees, '物権')[0].matches).toEqual([]);
  });

  it('全角と半角、大文字と小文字を区別しない', () => {
    const t = [manual('ＬＲＡの基準\n  より制限的でない他の手段')];
    expect(searchTrees(t, 'lra')).toHaveLength(1);
  });

  it('空の検索は何も返さない', () => {
    expect(searchTrees(trees, '  ')).toEqual([]);
  });
});
