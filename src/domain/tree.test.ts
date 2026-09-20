import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';
import {
  applyEdit,
  countLastMissed,
  countNodes,
  createTree,
  formatDue,
  nodeTone,
  partitionByDue,
  toLocalDate,
} from './tree';
import type { Tree } from './types';

const root = () => parseOutline('根\n  枝A\n    葉A\n  枝B')!;

function treeWith(id: string, due: string | null, createdAt = '2026-09-01T00:00:00.000Z'): Tree {
  const tree = createTree(root(), createdAt);
  return { ...tree, id, srs: { ...tree.srs, due } };
}

describe('countNodes', () => {
  it('returns the number of nodes excluding the root', () => {
    expect(countNodes(root())).toBe(3);
    expect(countNodes(parseOutline('根だけ')!)).toBe(0);
  });
});

describe('countLastMissed', () => {
  it('counts only the nodes missed last time', () => {
    const r = root();
    r.children[0].lastResult = false;
    r.children[0].children[0].lastResult = false;
    r.children[1].lastResult = true;
    r.children[1].missCount = 3;
    expect(countLastMissed(r)).toBe(2);
  });
});

describe('nodeTone', () => {
  it('gives shu (vermilion) to nodes missed last time, oudo (ochre) to nodes missed in the past, and sumi (ink) to the rest', () => {
    const n = root();
    expect(nodeTone(n)).toBe('sumi');
    expect(nodeTone({ ...n, missCount: 2, lastResult: true })).toBe('oudo');
    expect(nodeTone({ ...n, missCount: 2, lastResult: false })).toBe('shu');
    expect(nodeTone({ ...n, missCount: 2, lastResult: null })).toBe('oudo');
  });
});

describe('createTree', () => {
  it('creates a tree that has never been reviewed', () => {
    const tree = createTree(root(), '2026-09-19T01:02:03.000Z');
    expect(tree.srs.due).toBeNull();
    expect(tree.createdAt).toBe('2026-09-19T01:02:03.000Z');
    expect(tree.updatedAt).toBe(tree.createdAt);
    expect(tree.id).not.toBe('');
  });
});

describe('partitionByDue', () => {
  it('puts trees due today or earlier and never-reviewed trees in "today", and the rest in "later"', () => {
    const trees = [
      treeWith('future', '2026-09-25'),
      treeWith('today', '2026-09-19'),
      treeWith('never', null),
      treeWith('overdue', '2026-09-10'),
      treeWith('tomorrow', '2026-09-20'),
    ];
    const { dueToday, later } = partitionByDue(trees, '2026-09-19');
    // Overdue trees first, never-reviewed trees last
    expect(dueToday.map((t) => t.id)).toEqual(['overdue', 'today', 'never']);
    expect(later.map((t) => t.id)).toEqual(['tomorrow', 'future']);
  });

  it('orders never-reviewed trees by creation time', () => {
    const trees = [
      treeWith('b', null, '2026-09-02T00:00:00.000Z'),
      treeWith('a', null, '2026-09-01T00:00:00.000Z'),
    ];
    expect(partitionByDue(trees, '2026-09-19').dueToday.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('toLocalDate', () => {
  it("returns the device's calendar day as YYYY-MM-DD", () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('formatDue', () => {
  it('shows only month and day for dates this year, and includes the year otherwise', () => {
    expect(formatDue('2026-09-05', '2026-09-19')).toBe('9月5日');
    expect(formatDue('2027-01-05', '2026-12-28')).toBe('2027年1月5日');
  });
});

describe('applyEdit', () => {
  it('carries over node stats and spaced repetition state, advancing only updatedAt', () => {
    const tree = createTree(root(), '2026-09-01T00:00:00.000Z');
    tree.root.children[0].missCount = 2;
    tree.srs = { interval: 3, ease: 2.4, reps: 2, due: '2026-09-22', lastRatio: 0.8 };

    const edited = applyEdit(tree, parseOutline('根\n  枝A\n  枝C')!, '2026-09-19T00:00:00.000Z');
    expect(edited.id).toBe(tree.id);
    expect(edited.srs).toEqual(tree.srs);
    expect(edited.createdAt).toBe(tree.createdAt);
    expect(edited.updatedAt).toBe('2026-09-19T00:00:00.000Z');
    expect(edited.root.children.map((c) => [c.text, c.missCount])).toEqual([
      ['枝A', 2],
      ['枝C', 0],
    ]);
  });
});
