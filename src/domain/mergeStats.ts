import type { Node } from './types';

// 文言に改行は入らない（アウトラインの1行が1節）ので、パスの区切りに使える
const SEPARATOR = '\n';

// 編集後の木に、編集前の木の id と統計を引き継ぐ。
// 「根からのパス上の文言の並び」が一致する節を同一とみなす
export function mergeStats(oldRoot: Node, newRoot: Node): Node {
  // 同じパスの節が複数あるときは、上から順に1つずつ対応させる
  const oldByPath = new Map<string, Node[]>();
  const collect = (node: Node, parentPath: string) => {
    const path = parentPath + SEPARATOR + node.text;
    const bucket = oldByPath.get(path);
    if (bucket) bucket.push(node);
    else oldByPath.set(path, [node]);
    for (const child of node.children) collect(child, path);
  };
  collect(oldRoot, '');

  const merge = (node: Node, parentPath: string): Node => {
    const path = parentPath + SEPARATOR + node.text;
    const match = oldByPath.get(path)?.shift();
    return {
      id: match?.id ?? node.id,
      text: node.text,
      children: node.children.map((child) => merge(child, path)),
      missCount: match?.missCount ?? node.missCount,
      lastResult: match ? match.lastResult : node.lastResult,
    };
  };
  return merge(newRoot, '');
}
