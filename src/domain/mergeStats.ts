import type { Node } from './types';

// Node text never contains a newline (one outline line is one node), so it is safe as a path separator
const SEPARATOR = '\n';

// Carry the ids and stats of the tree before the edit over to the tree after the edit.
// Nodes whose "sequence of texts along the path from the root" matches are treated as the same node.
export function mergeStats(oldRoot: Node, newRoot: Node): Node {
  // When several nodes share the same path, they are paired one by one from the top
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
