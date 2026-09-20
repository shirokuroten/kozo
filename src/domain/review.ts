import { schedule } from './schedule';
import type { Node, NodeId, ReviewLog, Tree } from './types';

// The ○× marks given during a review. Nodes not graded yet are absent.
export type Grades = Record<NodeId, boolean>;

export interface ReviewSummary {
  total: number;
  graded: number;
  correct: number;
  finished: boolean;
}

export function summarize(root: Node, grades: Grades): ReviewSummary {
  let total = 0;
  let graded = 0;
  let correct = 0;
  const walk = (node: Node) => {
    for (const child of node.children) {
      total += 1;
      const grade = grades[child.id];
      if (grade !== undefined) graded += 1;
      if (grade === true) correct += 1;
      walk(child);
    }
  };
  walk(root);
  return { total, graded, correct, finished: total > 0 && graded === total };
}

function applyGrades(node: Node, grades: Grades): Node {
  const grade = grades[node.id];
  return {
    ...node,
    lastResult: grade === undefined ? node.lastResult : grade,
    missCount: node.missCount + (grade === false ? 1 : 0),
    children: node.children.map((child) => applyGrades(child, grades)),
  };
}

function missedIds(node: Node, grades: Grades): NodeId[] {
  return node.children.flatMap((child) => [
    ...(grades[child.id] === false ? [child.id] : []),
    ...missedIds(child, grades),
  ]);
}

function gradedIds(node: Node): NodeId[] {
  return node.children.flatMap((child) => [child.id, ...gradedIds(child)]);
}

export function applyReview(
  tree: Tree,
  grades: Grades,
  today: string,
  now: string,
): { tree: Tree; log: ReviewLog } {
  const { total, correct, finished } = summarize(tree.root, grades);
  // Moving the interval on a partial result would treat unopened nodes as "recalled"
  if (!finished) throw new Error('Cannot save a review before every node is graded');

  const ratio = correct / total;
  return {
    tree: {
      ...tree,
      root: applyGrades(tree.root, grades),
      srs: schedule(tree.srs, ratio, today),
      updatedAt: now,
    },
    log: {
      id: crypto.randomUUID(),
      treeId: tree.id,
      date: today,
      ratio,
      missedNodeIds: missedIds(tree.root, grades),
      // The tree can gain or lose nodes later, so the history needs the node set as it was today
      nodeIds: gradedIds(tree.root),
      at: now,
    },
  };
}
