import { parseOutline, toOutline } from './outline';
import { applyEdit, createTree } from './tree';
import type { Tree } from './types';

// Google Docs API (documents.get, includeTabsContent=true) の応答のうち、使う部分だけ
export interface GoogleDocBody {
  content?: {
    // 表や区切りなど、段落以外の要素は読み飛ばす
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
  // タブを持たない古い応答の形。tabs があればそちらを使う
  body?: GoogleDocBody;
  tabs?: GoogleDocTab[];
}

// 文書から切り出した木1本分。path は木の置かれた場所（タブ名、章の見出しなど）
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

// 段落内の改行（Shift+Enter）は縦タブで届く
const SOFT_BREAK = String.fromCharCode(0x0b);

const SKIPPED_STYLES = new Set(['TITLE', 'SUBTITLE']);
// 見出しのスタイルがない普通の段落は、どの見出しよりも下の段として扱う
const PLAIN_LEVEL = 7;

function headingLevel(style: string | undefined): number {
  const match = style?.match(/^HEADING_(\d)$/);
  return match ? Number(match[1]) : PLAIN_LEVEL;
}

// 本文1つ分を木に分ける。
// 箇条書きの直前にある見出し（または普通の段落）が根になり、その下の箇条書きが節になる。
// 下に箇条書きを持たない見出しは木にせず、木の場所を示す path に回す
function bodyToTrees(body: GoogleDocBody | undefined, basePath: string[]): DocTree[] {
  const trees: DocTree[] = [];
  // いまいる場所。見出しの段が浅い順に積む
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
      // 見出しより前に箇条書きが来たら、その最初の行を根にする
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

  // タブが1つだけの文書では、タブ名（たいてい「タブ 1」）を場所に含めても意味がない
  const single = doc.tabs.length === 1 && !doc.tabs[0].childTabs?.length;
  const walk = (tab: GoogleDocTab, parents: string[]): DocTree[] => {
    const path = single ? [] : [...parents, tab.tabProperties?.title ?? '無題のタブ'];
    return [
      ...bodyToTrees(tab.documentTab?.body, path),
      ...(tab.childTabs ?? []).flatMap((child) => walk(child, path)),
    ];
  };
  return doc.tabs.flatMap((tab) => walk(tab, []));
}

export interface SyncPlan {
  put: Tree[];
  created: number;
  updated: number;
  unchanged: number;
}

const samePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// 同期は文書からアプリへの一方向。
// 同じ文書の、同じ場所の、同じ見出しの木を同一とみなして中身だけ差し替える（記録は mergeStats で引き継ぐ）。
// 文書から消えた見出しの木は消さない。展開の記録を黙って失わせないため
export function planSync(
  existing: Tree[],
  docId: string,
  docTrees: DocTree[],
  now: string,
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

  // タブ名や章の見出しを変えても、中身がそっくり同じなら同じ木
  for (const item of incoming) {
    if (matches.has(item)) continue;
    const outline = toOutline(item.root);
    const match = candidates.find((t) => toOutline(t.root) === outline);
    if (!match) continue;
    matches.set(item, match);
    take(match);
  }

  // タブ名や章の見出しを変えただけで木が二重にならないよう、
  // 同じ見出しが双方に1つずつしか残っていなければ、場所が違っても同じ木とみなす
  for (const item of incoming) {
    if (matches.has(item)) continue;
    const sameText = candidates.filter((t) => t.root.text === item.root.text);
    const rivals = incoming.filter((i) => !matches.has(i) && i.root.text === item.root.text);
    if (sameText.length !== 1 || rivals.length !== 1) continue;
    matches.set(item, sameText[0]);
    take(sameText[0]);
  }

  const plan: SyncPlan = { put: [], created: 0, updated: 0, unchanged: 0 };
  for (const item of incoming) {
    const source = { kind: 'gdoc' as const, docId, path: item.path };
    const match = matches.get(item);
    if (!match) {
      plan.put.push({ ...createTree(item.root, now), source });
      plan.created += 1;
    } else if (
      toOutline(match.root) === toOutline(item.root) &&
      samePath(match.source?.path ?? [], item.path)
    ) {
      plan.unchanged += 1;
    } else {
      plan.put.push({ ...applyEdit(match, item.root, now), source });
      plan.updated += 1;
    }
  }
  return plan;
}
