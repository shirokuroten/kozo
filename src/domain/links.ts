import type { Tree } from './types';

// A node can point at another tree by writing its root text in double brackets: [[root text]].
// Plain text was chosen so the link survives every way a tree comes in (the editor, paste, Google Docs sync)

export interface Segment {
  text: string;
  // Present when the segment is a link. The root text of the tree it points at
  target?: string;
}

const LINK = /\[\[([^[\]]+?)\]\]/g;

export function parseLinks(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const target = match[1].trim();
    if (target === '') continue;
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    segments.push({ text: target, target });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments.length > 0 ? segments : [{ text }];
}

// During a review the brackets would only distract, so the text is shown without them
export function plainText(text: string): string {
  return parseLinks(text)
    .map((segment) => segment.text)
    .join('');
}

const normalize = (text: string) => text.normalize('NFKC').trim().toLowerCase();

// Headings such as "Requirements" repeat across books, so a tree from the same document wins
export function resolveLink(trees: Tree[], from: Tree, target: string): Tree | undefined {
  const wanted = normalize(target);
  const matches = trees.filter((t) => t.id !== from.id && normalize(t.root.text) === wanted);
  const sameDoc = from.source && matches.find((t) => t.source?.docId === from.source?.docId);
  return sameDoc || matches[0];
}
