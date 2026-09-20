import { mergeStats } from './mergeStats';
import { initialSrs } from './schedule';
import type { Node, Tree } from './types';

// The root is not graded, so it is not counted
export function countNodes(root: Node): number {
  return root.children.reduce((sum, child) => sum + 1 + countNodes(child), 0);
}

export function countLastMissed(root: Node): number {
  return root.children.reduce(
    (sum, child) => sum + (child.lastResult === false ? 1 : 0) + countLastMissed(child),
    0,
  );
}

export type NodeTone = 'shu' | 'oudo' | 'sumi';

export function nodeTone(node: Node): NodeTone {
  if (node.lastResult === false) return 'shu';
  if (node.missCount > 0) return 'oudo';
  return 'sumi';
}

export function createTree(root: Node, now: string): Tree {
  return { id: crypto.randomUUID(), root, srs: initialSrs(), createdAt: now, updatedAt: now };
}

export function partitionByDue(trees: Tree[], today: string): { dueToday: Tree[]; later: Tree[] } {
  const reviewed = trees.filter((t) => t.srs.due !== null);
  const byDue = (a: Tree, b: Tree) => a.srs.due!.localeCompare(b.srs.due!);
  const never = trees
    .filter((t) => t.srs.due === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    dueToday: [...reviewed.filter((t) => t.srs.due! <= today).sort(byDue), ...never],
    later: reviewed.filter((t) => t.srs.due! > today).sort(byDue),
  };
}

// Due dates are counted in the user's calendar days. toISOString is UTC, so in Japan it would
// still be the previous day until 9 a.m.
export function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The "next due date" shown on screen. The year is omitted for dates in the current year.
export function formatDue(due: string, today: string): string {
  const [y, m, d] = due.split('-').map(Number);
  const monthDay = `${m}月${d}日`;
  return due.slice(0, 4) === today.slice(0, 4) ? monthDay : `${y}年${monthDay}`;
}

// Saving an edit. The spaced repetition state belongs to the tree, so it carries over even when
// the content is rewritten.
export function applyEdit(tree: Tree, newRoot: Node, now: string): Tree {
  return { ...tree, root: mergeStats(tree.root, newRoot), updatedAt: now };
}
