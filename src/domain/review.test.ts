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
  it('根を除いた節を母数にして採点の進み具合を数える', () => {
    const { tree, a, leaf } = fixture();
    expect(summarize(tree.root, {})).toEqual({ total: 3, graded: 0, correct: 0, finished: false });
    expect(summarize(tree.root, { [a.id]: true, [leaf.id]: false })).toEqual({
      total: 3,
      graded: 2,
      correct: 1,
      finished: false,
    });
  });

  it('すべての節に付いたら完了', () => {
    const { tree, a, b, leaf } = fixture();
    const grades: Grades = { [a.id]: true, [b.id]: true, [leaf.id]: true };
    expect(summarize(tree.root, grades)).toEqual({
      total: 3,
      graded: 3,
      correct: 3,
      finished: true,
    });
  });

  it('木にない id の採点は数えない', () => {
    const { tree } = fixture();
    expect(summarize(tree.root, { ghost: true }).graded).toBe(0);
  });

  it('節のない木は完了にしない', () => {
    expect(summarize(parseOutline('根だけ')!, {}).finished).toBe(false);
  });
});

describe('applyReview', () => {
  it('節の統計、間隔反復、履歴をまとめて更新する', () => {
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
    // 根は採点しない
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

  it('引数の木を書き換えない', () => {
    const { tree, a, b, leaf } = fixture();
    applyReview(tree, { [a.id]: false, [b.id]: false, [leaf.id]: false }, TODAY, NOW);
    expect(a.missCount).toBe(0);
    expect(a.lastResult).toBeNull();
    expect(tree.srs.due).toBeNull();
  });

  it('採点が終わっていなければ例外にする', () => {
    const { tree, a } = fixture();
    expect(() => applyReview(tree, { [a.id]: true }, TODAY, NOW)).toThrow();
  });
});
