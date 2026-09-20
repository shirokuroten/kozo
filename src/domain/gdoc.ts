import { parseOutline, toOutline } from './outline';
import { applyEdit, createTree } from './tree';
import type { Tree } from './types';

// Only the parts we use of the Google Docs API response (documents.get, includeTabsContent=true)
export interface GoogleDocBody {
  content?: {
    // Elements other than paragraphs, such as tables and breaks, are skipped
    [other: string]: unknown;
    paragraph?: {
      elements?: { textRun?: { content?: string } }[];
      bullet?: { listId?: string; nestingLevel?: number };
      paragraphStyle?: { namedStyleType?: string };
    };
  }[];
}

export interface GoogleDocTab {
  tabProperties?: { title?: string };
  documentTab?: { body?: GoogleDocBody };
  childTabs?: GoogleDocTab[];
}

export interface GoogleDoc {
  title?: string;
  // The older response shape without tabs. If tabs is present, that is used instead.
  body?: GoogleDocBody;
  tabs?: GoogleDocTab[];
}

// One tree cut out of a document. path is the location of the tree (tab names, chapter headings, etc.).
export interface DocTree {
  path: string[];
  outline: string;
}

export function parseDocId(input: string): string | null {
  const text = input.trim();
  const fromUrl = text.match(/\/document\/d\/([\w-]+)/);
  if (fromUrl) return fromUrl[1];
  return /^[\w-]{20,}$/.test(text) ? text : null;
}

// A line break inside a paragraph (Shift+Enter) arrives as a vertical tab
const SOFT_BREAK = String.fromCharCode(0x0b);

const SKIPPED_STYLES = new Set(['TITLE', 'SUBTITLE']);
// A plain paragraph with no heading style is treated as a level below every heading
const PLAIN_LEVEL = 7;

function headingLevel(style: string | undefined): number {
  const match = style?.match(/^HEADING_(\d)$/);
  return match ? Number(match[1]) : PLAIN_LEVEL;
}

// Split one body into trees.
// The heading (or plain paragraph) right before a bullet list becomes the root, and the bullet list below it becomes the nodes.
// A heading with no bullet list below it does not become a tree. It goes into path, which shows the location of a tree.
function bodyToTrees(body: GoogleDocBody | undefined, basePath: string[]): DocTree[] {
  const trees: DocTree[] = [];
  // The current location. Headings are stacked from the shallowest level down.
  const headings: { level: number; text: string }[] = [];
  let lines: string[] | null = null;

  for (const { paragraph } of body?.content ?? []) {
    if (!paragraph) continue;
    const style = paragraph.paragraphStyle?.namedStyleType;
    if (SKIPPED_STYLES.has(style ?? '')) continue;

    const text = (paragraph.elements ?? [])
      .map((element) => element.textRun?.content ?? '')
      .join('')
      .split(SOFT_BREAK)
      .join(' ')
      .trim();
    if (text === '') continue;

    if (!paragraph.bullet) {
      const level = headingLevel(style);
      while (headings.length > 0 && headings[headings.length - 1].level >= level) headings.pop();
      headings.push({ level, text });
      lines = null;
      continue;
    }

    const depth = (paragraph.bullet.nestingLevel ?? 0) + 1;
    if (lines === null) {
      const root = headings[headings.length - 1];
      const path = [...basePath, ...headings.slice(0, -1).map((h) => h.text)];
      // If a bullet list comes before any heading, its first line becomes the root
      lines = root ? [root.text, '  '.repeat(depth) + text] : [text];
      trees.push({ path, outline: '' });
    } else {
      lines.push('  '.repeat(depth) + text);
    }
    trees[trees.length - 1].outline = lines.join('\n');
  }
  return trees;
}

export function docToTrees(doc: GoogleDoc): DocTree[] {
  if (!doc.tabs || doc.tabs.length === 0) return bodyToTrees(doc.body, []);

  // In a document with only one tab, including the tab name (usually "Tab 1") in the location adds nothing
  const single = doc.tabs.length === 1 && !doc.tabs[0].childTabs?.length;
  const walk = (tab: GoogleDocTab, parents: string[]): DocTree[] => {
    const path = single ? [] : [...parents, tab.tabProperties?.title ?? 'Untitled tab'];
    return [
      ...bodyToTrees(tab.documentTab?.body, path),
      ...(tab.childTabs ?? []).flatMap((child) => walk(child, path)),
    ];
  };
  return doc.tabs.flatMap((tab) => walk(tab, []));
}

export interface SyncPlan {
  put: Tree[];
  // Trees to remove from the app because they are gone from the document
  remove: Tree[];
  created: number;
  updated: number;
  unchanged: number;
}

const samePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Sync is one way, from the document to the app.
// A tree in the same document, at the same location, with the same heading is treated as the same tree,
// and only its content is replaced (stats carry over through mergeStats).
// The document is the source of truth and the app is its copy. A tree whose heading is gone from the
// document is removed from the app too.
// However, when not a single tree could be read from the document, nothing is removed.
// This keeps the user from losing everything when the document is emptied by mistake or the read goes wrong.
export function planSync(
  existing: Tree[],
  docId: string,
  docTrees: DocTree[],
  now: string,
  docTitle = '',
): SyncPlan {
  const candidates = existing.filter((t) => t.source?.kind === 'gdoc' && t.source.docId === docId);
  const incoming = docTrees.flatMap((docTree) => {
    const root = parseOutline(docTree.outline);
    return root ? [{ path: docTree.path, root }] : [];
  });
  const matches = new Map<(typeof incoming)[number], Tree>();
  const take = (tree: Tree) => candidates.splice(candidates.indexOf(tree), 1);

  for (const item of incoming) {
    const match = candidates.find(
      (t) => t.root.text === item.root.text && samePath(t.source?.path ?? [], item.path),
    );
    if (!match) continue;
    matches.set(item, match);
    take(match);
  }

  // Even if a tab name or chapter heading was changed, a tree with exactly the same content is the same tree
  for (const item of incoming) {
    if (matches.has(item)) continue;
    const outline = toOutline(item.root);
    const match = candidates.find((t) => toOutline(t.root) === outline);
    if (!match) continue;
    matches.set(item, match);
    take(match);
  }

  // So that merely renaming a tab or chapter heading does not duplicate a tree,
  // if exactly one tree with the same heading remains on each side, treat them as the same tree even though the location differs
  for (const item of incoming) {
    if (matches.has(item)) continue;
    const sameText = candidates.filter((t) => t.root.text === item.root.text);
    const rivals = incoming.filter((i) => !matches.has(i) && i.root.text === item.root.text);
    if (sameText.length !== 1 || rivals.length !== 1) continue;
    matches.set(item, sameText[0]);
    take(sameText[0]);
  }

  // The candidates still unmatched at this point are the trees that are gone from the document
  const plan: SyncPlan = {
    put: [],
    remove: incoming.length > 0 ? [...candidates] : [],
    created: 0,
    updated: 0,
    unchanged: 0,
  };
  incoming.forEach((item, order) => {
    // order is the position within the document. Kept so the list can follow the document's order.
    const source = { kind: 'gdoc' as const, docId, docTitle, path: item.path, order };
    const match = matches.get(item);
    if (!match) {
      plan.put.push({ ...createTree(item.root, now), source });
      plan.created += 1;
    } else if (
      toOutline(match.root) !== toOutline(item.root) ||
      !samePath(match.source?.path ?? [], item.path)
    ) {
      plan.put.push({ ...applyEdit(match, item.root, now), source });
      plan.updated += 1;
    } else {
      // A tree whose order or document title alone changed is rewritten but not counted as "updated".
      // This avoids reporting every tree below as updated just because one tree was added above.
      const moved = match.source?.order !== order || match.source?.docTitle !== docTitle;
      if (moved) plan.put.push({ ...match, source, updatedAt: now });
      plan.unchanged += 1;
    }
  });
  return plan;
}
