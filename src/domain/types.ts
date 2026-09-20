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
}
