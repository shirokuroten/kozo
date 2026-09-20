import { gradedNodes, isLabel } from './label';
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
  // Labels are scaffolding, not something to recall, so they are outside the count
  const nodes = gradedNodes(root);
  const total = nodes.length;
  const graded = nodes.filter((node) => grades[node.id] !== undefined).length;
  const correct = nodes.filter((node) => grades[node.id] === true).length;
  return { total, graded, correct, finished: total > 0 && graded === total };
}

function applyGrades(node: Node, grades: Grades): Node {
  // A stray grade for a label (or the root) must not leave a result on it
  const grade = isLabel(node) ? undefined : grades[node.id];
  return {
    ...node,
    lastResult: grade === undefined ? node.lastResult : grade,
    missCount: node.missCount + (grade === false ? 1 : 0),
    children: node.children.map((child) => applyGrades(child, grades)),
  };
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
  const nodes = gradedNodes(tree.root);
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
      missedNodeIds: nodes.filter((node) => grades[node.id] === false).map((node) => node.id),
      // The tree can gain or lose nodes later, so the history needs the node set as it was today
      nodeIds: nodes.map((node) => node.id),
      at: now,
    },
  };
}
