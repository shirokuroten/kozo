import type { Node } from './types';

const INDENT = '  ';
const FULLWIDTH_SPACE = String.fromCharCode(0x3000);

// 文書作成ソフトや Markdown から貼り付けた行の頭に付く記号。
// ハイフンなどは文中でも使うので、直後に空白があるときだけ記号とみなす
const BULLET = /^(?:[-*+](?:\s+|$)|[•●○◦▪■・]\s*)/;

export function createNode(text: string): Node {
  return { id: crypto.randomUUID(), text, children: [], missCount: 0, lastResult: null };
}

// タブと全角空白は半角空白2つ分として数える
export function indentWidth(line: string): number {
  let width = 0;
  for (const ch of line) {
    if (ch === ' ') width += 1;
    else if (ch === '\t' || ch === FULLWIDTH_SPACE) width += 2;
    else break;
  }
  return width;
}

export function hasBullet(line: string): boolean {
  return BULLET.test(line.trim());
}

function lineText(line: string): string {
  return line.trim().replace(BULLET, '').trim();
}

export function parseOutline(text: string): Node | null {
  let root: Node | null = null;
  // 根の下から、いま読んでいる節までの道筋。字下げの量を覚えておき、同じ量の行を兄弟にする
  const path: { depth: number; node: Node }[] = [];

  for (const line of text.split(/\r?\n/)) {
    const content = lineText(line);
    if (content === '') continue;

    const node = createNode(content);
    if (root === null) {
      root = node;
      continue;
    }

    // 書きかけの字下げで保存できなくなると困るので、深すぎる行も浅すぎる行も例外にしない。
    // 字下げなしの行も根の子になる。見出しの下に字下げなしの箇条書きが続く貼り付けを受けるため、
    // 1 に丸めずに量のまま比べる（丸めると、その下の空白2つの行が子ではなく兄弟になる）
    const depth = Math.floor(indentWidth(line) / 2);
    while (path.length > 0 && path[path.length - 1].depth >= depth) path.pop();
    const parent = path.length > 0 ? path[path.length - 1].node : root;
    parent.children.push(node);
    path.push({ depth, node });
  }

  return root;
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
