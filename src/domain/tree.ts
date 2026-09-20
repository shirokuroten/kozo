import { gradedNodes } from './label';
import { mergeStats } from './mergeStats';
import { initialSrs } from './schedule';
import type { Lang, Node, Tree } from './types';

// Counts what a review asks for. The root and labels are not graded, so they are not counted
export function countNodes(root: Node): number {
  return gradedNodes(root).length;
}

// A node that was turned into a label later may still carry an old result, so labels are left out here too
export function countLastMissed(root: Node): number {
  return gradedNodes(root).filter((node) => node.lastResult === false).length;
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

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// A short date as shown on screen. The year is omitted for dates in the current year.
// Month names are a fixed table rather than Intl, so the output does not vary with the runtime.
export function formatShortDate(date: string, today: string, lang: Lang): string {
  const [y, m, d] = date.split('-').map(Number);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  if (lang === 'ja') {
    const monthDay = `${m}月${d}日`;
    return sameYear ? monthDay : `${y}年${monthDay}`;
  }
  const monthDay = `${MONTHS_EN[m - 1]} ${d}`;
  return sameYear ? monthDay : `${monthDay}, ${y}`;
}

// The "next due date" and the dates of past reviews are written the same way. The name is kept
// so that call sites still say which date they show
export const formatDue = formatShortDate;

// Saving an edit. The spaced repetition state belongs to the tree, so it carries over even when
// the content is rewritten.
export function applyEdit(tree: Tree, newRoot: Node, now: string): Tree {
  return { ...tree, root: mergeStats(tree.root, newRoot), updatedAt: now };
}
