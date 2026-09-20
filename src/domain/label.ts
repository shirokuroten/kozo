import type { Node } from './types';

// A label is a node that is not recalled and not graded. It is scaffolding for what hangs under it:
// a connector such as 必要となるもの ("what is needed"), or a category to answer such as 理由 ("reason").
// It is marked by ending the line with a colon, which is how people already write such lines in notes.
// Being plain text, the mark survives every way a tree comes in (the editor, paste, Google Docs sync),
// and nothing has to be stored or migrated: a node is a label exactly when its text says so
const COLON = /[:：]\s*$/;

export function isLabelText(text: string): boolean {
  // A lone colon labels nothing
  return COLON.test(text) && text.replace(COLON, '').trim() !== '';
}

export function isLabel(node: Node): boolean {
  return isLabelText(node.text);
}

// The colon is only the mark, so it is dropped when the label is shown
export function labelText(text: string): string {
  return isLabelText(text) ? text.replace(COLON, '').trim() : text;
}

// The nodes that are recalled and graded: everything below the root except labels.
// Labels are skipped, but what hangs under them still counts
export function gradedNodes(root: Node): Node[] {
  return root.children.flatMap((child) => [
    ...(isLabel(child) ? [] : [child]),
    ...gradedNodes(child),
  ]);
}
