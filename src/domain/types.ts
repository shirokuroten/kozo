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
  // 文書の中での場所（タブ名、章の見出しなど）。根の上に小さく添える
  path?: string[];
  // 一覧で「文書 > タブ > 見出し > 木」と並べるための文書名と、文書の中での並び順
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
