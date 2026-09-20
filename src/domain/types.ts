// The UI language. Lives here so that domain helpers that format text do not depend on React
export type Lang = 'ja' | 'en';

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

// Where a tree synced from an external document came from. Trees made by hand do not have it.
export interface TreeSource {
  kind: 'gdoc';
  docId: string;
  // Location within the document (tab names, chapter headings, etc.). Shown small above the root.
  path?: string[];
  // Document title and order within the document, used to lay out the list as "document > tab > heading > tree"
  docTitle?: string;
  order?: number;
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
  // Every node graded in this review (all nodes except the root). Without it an old log cannot
  // tell "recalled" from "the node did not exist yet". Logs written before this field lack it
  nodeIds?: NodeId[];
  // When the review was saved (ISO timestamp). `date` alone cannot order two reviews of the same
  // day, and the table is keyed by a random id. Logs written before this field lack it
  at?: string;
}
