import type { Node, Tree } from './types';

// 一覧の入れ子。文書 > タブ > 見出し > 木 の順にまとめる
export interface ShelfGroup {
  name: string;
  // 開閉の状態を覚えるための一意な名前。根からの道筋をつないだもの
  key: string;
  groups: ShelfGroup[];
  trees: Tree[];
  // 下の階層も含めた木の本数
  count: number;
}

const UNTITLED_DOC = '無題の文書';
const KEY_SEPARATOR = '\n';

export function shelfPath(tree: Tree): string[] {
  if (!tree.source) return [];
  return [tree.source.docTitle || UNTITLED_DOC, ...(tree.source.path ?? [])];
}

function compare<T>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// 同期した木は文書ごとに、文書の中の順番どおりに。手で作った木は作った順に。
// 文書どうしは利用者が登録した順。登録を外した文書の木は、その後ろに文書名の順で置く
function shelfOrder(a: Tree, b: Tree, docOrder: string[]): number {
  if (a.source && b.source) {
    const rank = (docId: string) => {
      const index = docOrder.indexOf(docId);
      return index === -1 ? docOrder.length : index;
    };
    return (
      compare(rank(a.source.docId), rank(b.source.docId)) ||
      compare(a.source.docTitle ?? '', b.source.docTitle ?? '') ||
      compare(a.source.docId, b.source.docId) ||
      compare(a.source.order ?? 0, b.source.order ?? 0)
    );
  }
  if (a.source || b.source) return a.source ? -1 : 1;
  return compare(a.createdAt, b.createdAt);
}

export function buildShelf(trees: Tree[], docOrder: string[] = []): ShelfGroup {
  const root: ShelfGroup = { name: '', key: '', groups: [], trees: [], count: 0 };

  for (const tree of [...trees].sort((a, b) => shelfOrder(a, b, docOrder))) {
    let group = root;
    group.count += 1;
    // 同じ名前のタブが別の文書にあっても混ざらないよう、文書の段は id で見分ける
    const names = shelfPath(tree);
    names.forEach((name, depth) => {
      const part = depth === 0 ? `${tree.source!.docId}:${name}` : name;
      const key = group.key + KEY_SEPARATOR + part;
      let child = group.groups.find((g) => g.key === key);
      if (!child) {
        child = { name, key, groups: [], trees: [], count: 0 };
        group.groups.push(child);
      }
      child.count += 1;
      group = child;
    });
    group.trees.push(tree);
  }
  return root;
}

export interface SearchHit {
  tree: Tree;
  // 語が当たった節。それぞれ、根の子からその節までの文言の道筋
  matches: string[][];
}

// 全角と半角、大文字と小文字の違いで取りこぼさないようにそろえる
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function searchTrees(trees: Tree[], query: string): SearchHit[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const tree of trees) {
    const texts: string[] = [...shelfPath(tree), tree.root.text];
    const matches: string[][] = [];
    const walk = (node: Node, trail: string[]) => {
      for (const child of node.children) {
        const path = [...trail, child.text];
        texts.push(child.text);
        const text = normalize(child.text);
        if (terms.some((term) => text.includes(term))) matches.push(path);
        walk(child, path);
      }
    };
    walk(tree.root, []);

    const haystack = normalize(texts.join(KEY_SEPARATOR));
    if (terms.every((term) => haystack.includes(term))) hits.push({ tree, matches });
  }
  return hits;
}
