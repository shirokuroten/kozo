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

// 外の文書から同期した木の出どころ。手で作った木にはない
export interface TreeSource {
  kind: 'gdoc';
  docId: string;
}

export interface Tree {
  id: string;
  root: Node;
  srs: Srs;
  source?: TreeSource;
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
