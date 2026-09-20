import { hasBullet, indentWidth } from './outline';
import type { Node, ReviewLog, Srs, Tree } from './types';

// 旧名のまま。変えると、前に書き出した控えを読み込めなくなる
const APP = 'kozo';
const VERSION = 1;

export interface ExportFile {
  app: typeof APP;
  version: typeof VERSION;
  exportedAt: string;
  trees: Tree[];
  reviewLogs: ReviewLog[];
}

export function buildExport(trees: Tree[], reviewLogs: ReviewLog[], today: string): ExportFile {
  return { app: APP, version: VERSION, exportedAt: today, trees, reviewLogs };
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null;
const isNullOr = (v: unknown, type: string) => v === null || typeof v === type;

function isNode(v: unknown): v is Node {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    typeof v.missCount === 'number' &&
    isNullOr(v.lastResult, 'boolean') &&
    Array.isArray(v.children) &&
    v.children.every(isNode)
  );
}

function isSrs(v: unknown): v is Srs {
  return (
    isObject(v) &&
    typeof v.interval === 'number' &&
    typeof v.ease === 'number' &&
    typeof v.reps === 'number' &&
    isNullOr(v.due, 'string') &&
    isNullOr(v.lastRatio, 'number')
  );
}

function isTree(v: unknown): v is Tree {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string' &&
    isNode(v.root) &&
    isSrs(v.srs) &&
    (v.source === undefined || isSource(v.source))
  );
}

function isSource(v: unknown): boolean {
  return (
    isObject(v) &&
    v.kind === 'gdoc' &&
    typeof v.docId === 'string' &&
    (v.docTitle === undefined || typeof v.docTitle === 'string') &&
    (v.order === undefined || typeof v.order === 'number') &&
    (v.path === undefined ||
      (Array.isArray(v.path) && v.path.every((part) => typeof part === 'string')))
  );
}

function isReviewLog(v: unknown): v is ReviewLog {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.treeId === 'string' &&
    typeof v.date === 'string' &&
    typeof v.ratio === 'number' &&
    Array.isArray(v.missedNodeIds) &&
    v.missedNodeIds.every((id) => typeof id === 'string')
  );
}

// 壊れたファイルを入れると一覧ごと開けなくなるので、形を確かめてから渡す
export function parseImport(json: string): { trees: Tree[]; reviewLogs: ReviewLog[] } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('JSON として読めない');
  }
  if (!isObject(data) || data.app !== APP) throw new Error('このアプリの書き出しファイルではない');
  if (data.version !== VERSION) throw new Error('このファイルの版には対応していない');

  const trees = data.trees;
  const reviewLogs = data.reviewLogs ?? [];
  if (!Array.isArray(trees) || !trees.every(isTree)) throw new Error('木の形が壊れている');
  if (!Array.isArray(reviewLogs) || !reviewLogs.every(isReviewLog)) {
    throw new Error('履歴の形が壊れている');
  }
  return { trees, reviewLogs };
}

// 読み込みは追加。同じ id の木は新しい方を残す
export function pickNewer(existing: Tree[], incoming: Tree[]): Tree[] {
  const updatedAt = new Map(existing.map((t) => [t.id, t.updatedAt]));
  return incoming.filter((t) => {
    const mine = updatedAt.get(t.id);
    return mine === undefined || t.updatedAt > mine;
  });
}

export function toMarkdown(root: Node): string {
  const lines: string[] = [];
  const walk = (node: Node, depth: number) => {
    lines.push(`${'  '.repeat(depth)}- ${node.text}`);
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(root, 0);
  return lines.join('\n');
}

// まとめて取り込むときの切り分け。字下げも箇条書きの記号もない行を、新しい木の見出しとみなす。
// 文書作成ソフトで「見出しの段落 + その下の箇条書き」を並べた文書を、そのまま貼れるようにするため
export function splitOutlines(text: string): string[] {
  const chunks: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const isHeading = indentWidth(line) < 2 && !hasBullet(line);
    if (isHeading || chunks.length === 0) chunks.push([line]);
    else chunks[chunks.length - 1].push(line);
  }
  return chunks.map((lines) => lines.join('\n'));
}
