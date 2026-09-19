export type NodeId = string;

export interface Node {
  id: NodeId;
  text: string;
  children: Node[];
  missCount: number;
  lastResult: boolean | null;
}

export interface Srs {
  interval: number;
  ease: number;
  reps: number;
  due: string | null;
  lastRatio: number | null;
}

export interface Tree {
  id: string;
  root: Node;
  srs: Srs;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  treeId: string;
  date: string;
  ratio: number;
  missedNodeIds: NodeId[];
}
