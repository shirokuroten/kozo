import { parseOutline, toOutline } from './outline';
import { applyEdit, createTree } from './tree';
import type { Tree } from './types';

// Google Docs API (documents.get) の応答のうち、使う部分だけ
export interface GoogleDoc {
  title?: string;
  body?: {
    content?: {
      // 表や区切りなど、段落以外の要素は読み飛ばす
      [other: string]: unknown;
      paragraph?: {
        elements?: { textRun?: { content?: string } }[];
        bullet?: { listId?: string; nestingLevel?: number };
        paragraphStyle?: { namedStyleType?: string };
      };
    }[];
  };
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

// 文書を木ごとのアウトラインに分ける。
// 箇条書きでない段落が見出し（根）になり、次の見出しまでの箇条書きがその木の節になる
export function docToOutlines(doc: GoogleDoc): string[] {
  const chunks: string[][] = [];
  for (const { paragraph } of doc.body?.content ?? []) {
    if (!paragraph) continue;
    if (SKIPPED_STYLES.has(paragraph.paragraphStyle?.namedStyleType ?? '')) continue;

    const text = (paragraph.elements ?? [])
      .map((element) => element.textRun?.content ?? '')
      .join('')
      .split(SOFT_BREAK)
      .join(' ')
      .trim();
    if (text === '') continue;

    if (!paragraph.bullet || chunks.length === 0) {
      chunks.push([text]);
    } else {
      const depth = (paragraph.bullet.nestingLevel ?? 0) + 1;
      chunks[chunks.length - 1].push('  '.repeat(depth) + text);
    }
  }
  return chunks.map((lines) => lines.join('\n'));
}

export interface SyncPlan {
  put: Tree[];
  created: number;
  updated: number;
  unchanged: number;
}

// 同期は文書からアプリへの一方向。
// 同じ文書から来た、同じ見出しの木を同一とみなして中身だけ差し替える（記録は mergeStats で引き継ぐ）。
// 文書から消えた見出しの木は消さない。展開の記録を黙って失わせないため
export function planSync(
  existing: Tree[],
  docId: string,
  outlines: string[],
  now: string,
): SyncPlan {
  const candidates = existing.filter((t) => t.source?.kind === 'gdoc' && t.source.docId === docId);
  const plan: SyncPlan = { put: [], created: 0, updated: 0, unchanged: 0 };

  for (const outline of outlines) {
    const root = parseOutline(outline);
    if (!root) continue;

    const index = candidates.findIndex((t) => t.root.text === root.text);
    if (index === -1) {
      plan.put.push({ ...createTree(root, now), source: { kind: 'gdoc', docId } });
      plan.created += 1;
      continue;
    }

    const [match] = candidates.splice(index, 1);
    if (toOutline(match.root) === toOutline(root)) {
      plan.unchanged += 1;
    } else {
      plan.put.push(applyEdit(match, root, now));
      plan.updated += 1;
    }
  }
  return plan;
}
