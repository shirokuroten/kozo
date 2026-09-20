import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';
import { applyReview, summarize, type Grades } from './review';
import { createTree } from './tree';

const NOW = '2026-09-19T10:00:00.000Z';
const TODAY = '2026-09-19';

function fixture() {
  const tree = createTree(parseOutline('根\n  枝A\n    葉A\n  枝B')!, '2026-09-01T00:00:00.000Z');
  const [a, b] = tree.root.children;
  const leaf = a.children[0];
  return { tree, a, b, leaf };
}

describe('summarize', () => {
  it('counts grading progress with the nodes excluding the root as the total', () => {
    const { tree, a, leaf } = fixture();
    expect(summarize(tree.root, {})).toEqual({ total: 3, graded: 0, correct: 0, finished: false });
    expect(summarize(tree.root, { [a.id]: true, [leaf.id]: false })).toEqual({
      total: 3,
      graded: 2,
      correct: 1,
      finished: false,
    });
  });

  it('is finished once every node is graded', () => {
    const { tree, a, b, leaf } = fixture();
    const grades: Grades = { [a.id]: true, [b.id]: true, [leaf.id]: true };
    expect(summarize(tree.root, grades)).toEqual({
      total: 3,
      graded: 3,
      correct: 3,
      finished: true,
    });
  });

  it('does not count grades for ids that are not in the tree', () => {
    const { tree } = fixture();
    expect(summarize(tree.root, { ghost: true }).graded).toBe(0);
  });

  it('never marks a tree without nodes as finished', () => {
    expect(summarize(parseOutline('根だけ')!, {}).finished).toBe(false);
  });
});

describe('applyReview', () => {
  it('updates node stats, spaced repetition, and the log together', () => {
    const { tree, a, b, leaf } = fixture();
    a.missCount = 1;
    const grades: Grades = { [a.id]: false, [b.id]: true, [leaf.id]: true };
    const { tree: next, log } = applyReview(tree, grades, TODAY, NOW);

    const [nextA, nextB] = next.root.children;
    expect(nextA.lastResult).toBe(false);
    expect(nextA.missCount).toBe(2);
    expect(nextB.lastResult).toBe(true);
    expect(nextB.missCount).toBe(0);
    expect(nextA.children[0].lastResult).toBe(true);
    // The root is not graded
    expect(next.root.lastResult).toBeNull();

    expect(next.srs.lastRatio).toBeCloseTo(2 / 3);
    expect(next.srs.due).toBe('2026-09-20');
    expect(next.updatedAt).toBe(NOW);

    expect(log.treeId).toBe(tree.id);
    expect(log.date).toBe(TODAY);
    expect(log.ratio).toBeCloseTo(2 / 3);
    expect(log.missedNodeIds).toEqual([a.id]);
    expect(log.id).not.toBe('');
  });

  it('does not mutate the tree passed in', () => {
    const { tree, a, b, leaf } = fixture();
    applyReview(tree, { [a.id]: false, [b.id]: false, [leaf.id]: false }, TODAY, NOW);
    expect(a.missCount).toBe(0);
    expect(a.lastResult).toBeNull();
    expect(tree.srs.due).toBeNull();
  });

  it('throws when grading is not finished', () => {
    const { tree, a } = fixture();
    expect(() => applyReview(tree, { [a.id]: true }, TODAY, NOW)).toThrow();
  });
});
