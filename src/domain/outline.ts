import type { Node } from './types';

const INDENT = '  ';

export function createNode(text: string): Node {
  return { id: crypto.randomUUID(), text, children: [], missCount: 0, lastResult: null };
}

// タブと全角空白は半角空白2つ分として数える
function indentWidth(line: string): number {
  let width = 0;
  for (const ch of line) {
    if (ch === ' ') width += 1;
    else if (ch === '\t' || ch === '　') width += 2;
    else break;
  }
  return width;
}

export function parseOutline(text: string): Node | null {
  // path[d] は、いま読んでいる位置で深さ d にある節
  const path: Node[] = [];

  for (const line of text.split(/\r?\n/)) {
    const content = line.trim();
    if (content === '') continue;

    const node = createNode(content);
    if (path.length === 0) {
      path.push(node);
      continue;
    }

    // 書きかけの字下げで保存できなくなると困るので、深すぎる行も浅すぎる行も例外にせず丸める
    const depth = Math.min(Math.max(1, Math.floor(indentWidth(line) / 2)), path.length);
    path.length = depth;
    path[depth - 1].children.push(node);
    path.push(node);
  }

  return path[0] ?? null;
}

export function toOutline(root: Node): string {
  const lines: string[] = [];
  const walk = (node: Node, depth: number) => {
    lines.push(INDENT.repeat(depth) + node.text);
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(root, 0);
  return lines.join('\n');
}
