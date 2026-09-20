import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from '../domain/types';

export type { Lang };

const STORAGE_KEY = 'kozo:lang';

// English nouns change with the count, Japanese counters do not
function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// The Japanese wording was approved against the design document. It is the source of the key set:
// the English object is typed against it, so a key missing on either side fails the build
export const ja = {
  common: {
    back: '戻る',
    loading: '読み込み中',
    dbFailed: '端末内のデータを開けなかった。ブラウザの設定で保存が禁止されていないか確認する',
    treeNotFound: 'この木は見つからない',
    nodeCount: (n: number) => `${n} 節`,
  },
  home: {
    subtitle: '木を上から展開して、自分で再現する',
    noTrees: 'まだ木がない。最初の1本を作る',
    search: '木をさがす',
    found: (n: number) => (n > 0 ? `${n} 本の木にあった` : '見つからなかった'),
    moreNodes: (n: number) => `ほか ${n} 節`,
    dueCount: (n: number) => `出番の木 ${n} 本`,
    newTree: '新しい木を作る',
    data: '取り込みとバックアップ',
  },
  row: {
    missedLast: (n: number) => `前回 ${n} 節で落ちた`,
    neverReviewed: 'まだ一度も展開していない',
    nextDue: (date: string) => `次の出番 ${date}`,
    review: '展開',
  },
  shelf: {
    treeCount: (n: number) => `${n} 本`,
    open: '開く',
    close: '閉じる',
  },
  due: {
    title: '出番',
    note: '前に落ちた節が多い木ほど早く出番が来る。全部やる必要はない。時間のあるときに上から開く',
    dueNow: (n: number) => `出番が来ている ${n} 本`,
    later: 'この先',
  },
  view: {
    nextDueEvery: (date: string, interval: number) => `次の出番 ${date}（${interval}日間隔）`,
    reviewNow: '今すぐ展開する',
    edit: '編集',
    copyMarkdown: 'Markdown をコピー',
    copied: 'コピーした',
    remove: '削除',
    confirmRemove: (root: string) => `「${root}」を削除する。元に戻せない`,
    missCount: (n: number) => `落 ${n}`,
  },
  edit: {
    hint: '1行目が見出し。行頭の空白2つ（または全角空白）で1段深くなる',
    placeholder: `見出し
  枝
    内容
  枝
    内容`,
    outlineLabel: 'アウトライン',
    save: 'この木を保存',
    confirmLeave: '保存していない。このまま離れる',
  },
  review: {
    noNodes: 'この木にはまだ節がない。編集で枝を書いてから展開する',
    progressLabel: (graded: number, total: number) => `採点済み ${graded}、全 ${total} 節`,
    stop: '中断',
    recalled: '言えた',
    missed: '言えなかった',
    expand: (n: number) => `枝が ${n} 本。思い出してから開く`,
    allRecalled: (total: number) => `${total} / ${total} が言えた。木が丸ごと再現できている`,
    someMissed: (correct: number, total: number) =>
      `${correct} / ${total} が言えた。落ちた節は次回、木の上で朱色で表示される`,
    saveResult: '結果を保存',
  },
  queue: {
    reviewGroup: (n: number) => (n === 1 ? 'この 1 本を展開' : `この ${n} 本を続けて展開`),
    reviewDue: (n: number) => `出番の ${n} 本を続けて展開`,
    // position counts from 1
    position: (position: number, total: number) => `${total} 本中 ${position} 本目`,
    saveAndNext: '結果を保存して次へ',
    skip: 'この木を飛ばす',
  },
  data: {
    intro:
      '木は一覧の「新しい木を作る」で1本ずつ書ける。ここは、別の場所に書きためた木をまとめて入れるための画面。下の2つのどちらかを使う。いちばん下は控えを取る機能',
    googleTitle: 'Google ドキュメントから取り込む',
    pasteTitle: '貼り付けて取り込む',
    pasteNote:
      'Google を使わないときはこちら。メモや文書に書いた木をコピーして、下の欄に貼る。字下げも記号もない行が見出しになり、そこから次の見出しまでが1本の木になる。貼るたびに新しい木として増える',
    pastePlaceholder: `人権の三要素
- 固有性
  - 人間であることにより当然に有する権利
- 不可侵性

違憲審査基準
- 厳格審査
- 中間審査`,
    pasteLabel: 'まとめて取り込むアウトライン',
    importTrees: (n: number) => (n > 0 ? `${n} 本の木を取り込む` : '木を取り込む'),
    pasted: (n: number) => `${n} 本の木を取り込んだ`,
    backupTitle: 'バックアップと引っ越し',
    backupNote:
      '木と展開の記録はこの端末の中にしかない。「書き出す」で控えのファイルを1つ作れる。別の端末や、データが消えたあとに「読み込む」と元に戻る。読み込んでも手元の木は消えない',
    exportBackup: '控えを書き出す',
    importBackup: '控えを読み込む',
    exported: (n: number) => `${n} 本の木を書き出した`,
    imported: (n: number, keptNewer: boolean) =>
      `${n} 本の木を読み込んだ` + (keptNewer ? '。手元の方が新しい木はそのまま残した' : ''),
    importFailed: (reason: string) => `読み込めなかった。${reason}`,
  },
  google: {
    setupNote:
      'Google ドキュメントに書いた木を、ボタン1つで取り込めるようにする。最初に1度だけ、自分用のクライアント ID をここに貼る（作り方は docs/GOOGLE.md）。ID はこの端末の中だけに保存する',
    clientIdLabel: 'Google のクライアント ID',
    saveClientId: 'クライアント ID を保存',
    clientIdSaved: 'クライアント ID を保存した',
    clientIdCleared: 'クライアント ID を消した',
    changeClientId: 'クライアント ID を変える',
    linkedNote:
      'Google ドキュメントに「見出しの行 + その下の箇条書き」で書いておくと、見出しごとに1本の木になる。文書を直したら「同期」を押すだけで、木が増えたり更新されたりする。何度押しても木は重複せず、落ちた回数も残る。文書から消した木は、アプリからも消える。文書の側は書き換えない',
    lastSynced: (when: string) => `前回の同期 ${when}`,
    neverSynced: 'まだ同期していない',
    unlink: '外す',
    urlLabel: 'Google ドキュメントの URL',
    badUrl: 'Google ドキュメントの URL として読めない',
    addAndSync: 'この文書を登録して同期',
  },
  sync: {
    withGoogle: 'Google ドキュメントと同期',
    one: '同期',
    all: 'すべて同期',
    syncing: '同期中',
    failed: (reason: string) => `同期できなかった。${reason}`,
    result: (title: string, created: number, updated: number, removed: number) => {
      const parts = [
        created > 0 ? `新しい木 ${created} 本` : '',
        updated > 0 ? `更新 ${updated} 本` : '',
        removed > 0 ? `文書から消えたので消した木 ${removed} 本` : '',
      ].filter(Boolean);
      return parts.length === 0
        ? `「${title}」に変わったところはなかった`
        : `「${title}」を同期した。${parts.join('、')}`;
    },
  },
};

export type Messages = typeof ja;

// Error reasons are always English, so a missing reason must not leave a dangling separator
function withReason(head: string, reason: string): string {
  return reason ? `${head}. ${reason}` : head;
}

export const en: Messages = {
  common: {
    back: 'Back',
    loading: 'Loading',
    dbFailed:
      'Could not open the data on this device. Check that the browser settings allow storage',
    treeNotFound: 'Tree not found',
    nodeCount: (n) => plural(n, '1 node', `${n} nodes`),
  },
  home: {
    subtitle: 'Open a tree from the top and rebuild it yourself',
    noTrees: 'No trees yet. Make the first one',
    search: 'Find a tree',
    found: (n) => (n > 0 ? plural(n, 'Found in 1 tree', `Found in ${n} trees`) : 'Nothing found'),
    moreNodes: (n) => plural(n, '1 more node', `${n} more nodes`),
    dueCount: (n) => plural(n, '1 tree due', `${n} trees due`),
    newTree: 'New tree',
    data: 'Import and backup',
  },
  row: {
    missedLast: (n) => plural(n, 'Missed 1 node last time', `Missed ${n} nodes last time`),
    neverReviewed: 'Not reviewed yet',
    nextDue: (date) => `Next due ${date}`,
    review: 'Review',
  },
  shelf: {
    treeCount: (n) => plural(n, '1 tree', `${n} trees`),
    open: 'Open',
    close: 'Close',
  },
  due: {
    title: 'Due',
    note: 'Trees with more missed nodes come due sooner. There is no need to do them all. Open them from the top when there is time',
    dueNow: (n) => plural(n, '1 tree due now', `${n} trees due now`),
    later: 'Later',
  },
  view: {
    nextDueEvery: (date, interval) =>
      `Next due ${date} (${plural(interval, 'every day', `every ${interval} days`)})`,
    reviewNow: 'Review now',
    edit: 'Edit',
    copyMarkdown: 'Copy as Markdown',
    copied: 'Copied',
    remove: 'Delete',
    confirmRemove: (root) => `Delete "${root}". This cannot be undone`,
    missCount: (n) => `Missed ${n}`,
  },
  edit: {
    hint: 'First line is the heading. Indent two spaces (or a tab) to go one level deeper',
    placeholder: `Elements of a contract
  Offer
    A proposal showing intent to be bound
  Acceptance
  Consideration`,
    outlineLabel: 'Outline',
    save: 'Save tree',
    confirmLeave: 'Not saved. Leave anyway',
  },
  review: {
    noNodes: 'This tree has no nodes yet. Add branches in Edit, then review',
    progressLabel: (graded, total) =>
      `Graded ${graded} of ${plural(total, '1 node', `${total} nodes`)}`,
    stop: 'Stop',
    recalled: 'Recalled',
    missed: 'Missed',
    expand: (n) =>
      plural(n, '1 branch. Recall it, then open', `${n} branches. Recall them, then open`),
    allRecalled: (total) => `Recalled ${total} / ${total}. The whole tree is intact`,
    someMissed: (correct, total) =>
      `Recalled ${correct} / ${total}. Missed nodes will show in vermilion on the tree next time`,
    saveResult: 'Save result',
  },
  queue: {
    reviewGroup: (n) => plural(n, 'Review this tree', `Review these ${n} trees in a row`),
    reviewDue: (n) => `Review all ${n} due trees in a row`,
    position: (position, total) => `Tree ${position} of ${total}`,
    saveAndNext: 'Save and go to next',
    skip: 'Skip this tree',
  },
  data: {
    intro:
      'Trees can be written one at a time with "New tree" on the list. This screen is for bringing in many trees written somewhere else. Use either of the two ways below. The last section makes a backup',
    googleTitle: 'Import from Google Docs',
    pasteTitle: 'Paste to import',
    pasteNote:
      'Use this when not using Google. Copy trees written in notes or a document and paste them below. A line with no indent and no bullet becomes a heading, and everything up to the next heading becomes one tree. Each paste adds new trees',
    pastePlaceholder: `Elements of a contract
- Offer
  - A proposal showing intent to be bound
- Acceptance

Remedies for breach
- Damages
- Specific performance`,
    pasteLabel: 'Outlines to import together',
    importTrees: (n) => (n > 0 ? plural(n, 'Import 1 tree', `Import ${n} trees`) : 'Import trees'),
    pasted: (n) => plural(n, 'Imported 1 tree', `Imported ${n} trees`),
    backupTitle: 'Backup and moving',
    backupNote:
      'Trees and review records exist only on this device. "Export backup" makes one backup file. "Import backup" on another device, or after data is lost, brings everything back. Importing does not delete the trees already here',
    exportBackup: 'Export backup',
    importBackup: 'Import backup',
    exported: (n) => plural(n, 'Exported 1 tree', `Exported ${n} trees`),
    imported: (n, keptNewer) =>
      plural(n, 'Loaded 1 tree from the backup', `Loaded ${n} trees from the backup`) +
      (keptNewer ? '. Trees that are newer on this device were left as they are' : ''),
    importFailed: (reason) => withReason('Import failed', reason),
  },
  google: {
    setupNote:
      'Lets trees written in Google Docs be imported with one button. Once, at the start, paste your own client ID here (docs/GOOGLE.md explains how to make one). The ID is stored only on this device',
    clientIdLabel: 'Google client ID',
    saveClientId: 'Save client ID',
    clientIdSaved: 'Client ID saved',
    clientIdCleared: 'Client ID removed',
    changeClientId: 'Change client ID',
    linkedNote:
      'Write in Google Docs as "a heading line + bullets under it" and each heading becomes one tree. After editing the document, press "Sync" and trees are added or updated. Pressing it again never duplicates trees, and miss counts are kept. Trees removed from the document are removed from the app too. The document itself is never changed',
    lastSynced: (when) => `Last synced ${when}`,
    neverSynced: 'Not synced yet',
    unlink: 'Unlink',
    urlLabel: 'Google Docs URL',
    badUrl: 'Not a Google Docs URL',
    addAndSync: 'Add this document and sync',
  },
  sync: {
    withGoogle: 'Sync with Google Docs',
    one: 'Sync',
    all: 'Sync all',
    syncing: 'Syncing',
    failed: (reason) => withReason('Sync failed', reason),
    result: (title, created, updated, removed) => {
      const parts = [
        created > 0 ? `${created} new` : '',
        updated > 0 ? `${updated} updated` : '',
        removed > 0
          ? `${removed} removed because ${plural(removed, 'it is', 'they are')} gone from the document`
          : '',
      ].filter(Boolean);
      return parts.length === 0
        ? `Nothing changed in "${title}"`
        : `Synced "${title}". ${parts.join(', ')}`;
    },
  },
};

const MESSAGES: Record<Lang, Messages> = { ja, en };

export function detectLang(saved: string | null, browser: string): Lang {
  if (saved === 'ja' || saved === 'en') return saved;
  return browser.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

function initialLang(): Lang {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can throw in private mode. Fall back to the browser language every time
  }
  return detectLang(saved, navigator.language ?? '');
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
}

const I18nContext = createContext<I18n>({ lang: 'en', setLang: () => {}, t: en });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Failing to remember the choice only means it is asked of the browser again next time
    }
  }, []);

  // Screen readers and the browser's font selection for CJK text both depend on the lang attribute
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang] }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
