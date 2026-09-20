import type { Node, Tree } from './types';

// The nesting of the list. Grouped in the order document > tab > heading > tree.
export interface ShelfGroup {
  name: string;
  // A unique name used to remember the open or closed state. It joins the trail from the root.
  key: string;
  groups: ShelfGroup[];
  trees: Tree[];
  // Number of trees, including those in the levels below
  count: number;
}

const UNTITLED_DOC = 'Untitled document';
const KEY_SEPARATOR = '\n';

export function shelfPath(tree: Tree): string[] {
  if (!tree.source) return [];
  return [tree.source.docTitle || UNTITLED_DOC, ...(tree.source.path ?? [])];
}

function compare<T>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Synced trees go document by document, in their order within the document. Trees made by hand go in creation order.
// Documents themselves follow the order the user registered them in. Trees of documents that were
// unregistered come after those, ordered by document title.
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
    // The document level is told apart by id, so tabs with the same name in different documents do not get mixed
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
  // Nodes that a term matched. Each is the trail of texts from a child of the root down to that node.
  matches: string[][];
}

// Normalize so matches are not lost to full-width vs half-width or upper vs lower case differences
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
