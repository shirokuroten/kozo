import type { Node } from './types';

const INDENT = '  ';
const FULLWIDTH_SPACE = String.fromCharCode(0x3000);

// Markers found at the start of lines pasted from a word processor or Markdown.
// Hyphens and the like also appear inside text, so they count as markers only when followed by whitespace.
const BULLET = /^(?:[-*+](?:\s+|$)|[•●○◦▪■・]\s*)/;

export function createNode(text: string): Node {
  return { id: crypto.randomUUID(), text, children: [], missCount: 0, lastResult: null };
}

// A tab and a full-width space each count as two half-width spaces
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
  // The trail from below the root to the node being read. The indentation width is remembered so
  // that lines with the same width become siblings.
  const path: { depth: number; node: Node }[] = [];

  for (const line of text.split(/\r?\n/)) {
    const content = lineText(line);
    if (content === '') continue;

    const node = createNode(content);
    if (root === null) {
      root = node;
      continue;
    }

    // Being unable to save because of half-finished indentation would be a problem, so neither
    // lines that are too deep nor lines that are too shallow throw.
    // A line with no indentation also becomes a child of the root. To accept pasted text where a
    // heading is followed by a bullet list with no indentation, the width is compared as is rather
    // than rounded up to 1 (rounding would make a line with two spaces below it a sibling instead of a child).
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
