import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { repository } from '../data';
import { parseOutline } from '../domain/outline';
import { buildExport, parseImport, splitOutlines } from '../domain/portable';
import { countNodes, createTree } from '../domain/tree';
import type { Node } from '../domain/types';
import { Button } from './Button';
import { GoogleSection } from './GoogleSection';
import { Note } from './Note';
import { navigate } from './route';

const BULK_PLACEHOLDER = `人権の三要素
- 固有性
  - 人間であることにより当然に有する権利
- 不可侵性

違憲審査基準
- 厳格審査
- 中間審査`;

interface Props {
  today: string;
  onChanged: () => Promise<void>;
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mt-8 mb-1 font-gothic text-sm text-sumi">{children}</h2>;
}

export function DataScreen({ today, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [bulkText, setBulkText] = useState('');
  const bulkRoots = useMemo(
    () => splitOutlines(bulkText).flatMap((chunk) => parseOutline(chunk) ?? []),
    [bulkText],
  );

  const exportAll = async () => {
    const [trees, logs] = await Promise.all([repository.listTrees(), repository.listReviewLogs()]);
    const json = JSON.stringify(buildExport(trees, logs, today), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `outline-recall-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${trees.length} 本の木を書き出した`);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the selection so the same file can be chosen again right after
    event.target.value = '';
    if (!file) return;
    try {
      const { trees, reviewLogs } = parseImport(await file.text());
      const result = await repository.importData(trees, reviewLogs);
      await onChanged();
      setMessage(
        `${result.trees} 本の木を読み込んだ` +
          (result.trees < trees.length ? '。手元の方が新しい木はそのまま残した' : ''),
      );
    } catch (error) {
      setMessage(`読み込めなかった。${error instanceof Error ? error.message : ''}`);
    }
  };

  const importBulk = async () => {
    const now = new Date().toISOString();
    await repository.addTrees(bulkRoots.map((root: Node) => createTree(root, now)));
    await onChanged();
    setMessage(`${bulkRoots.length} 本の木を取り込んだ`);
    setBulkText('');
  };

  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        戻る
      </Button>
      <h1 className="font-mincho text-[20px] leading-[1.6] text-sumi">取り込みとバックアップ</h1>
      <Note>
        木は一覧の「新しい木を作る」で1本ずつ書ける。ここは、別の場所に書きためた木をまとめて入れるための画面。下の2つのどちらかを使う。いちばん下は控えを取る機能
      </Note>
      <p role="status" className="mt-2 min-h-5 font-gothic text-sm whitespace-pre-line text-sumi">
        {message}
      </p>

      <SectionTitle>Google ドキュメントから取り込む</SectionTitle>
      <GoogleSection onChanged={onChanged} onMessage={setMessage} />

      <SectionTitle>貼り付けて取り込む</SectionTitle>
      <Note>
        Google
        を使わないときはこちら。メモや文書に書いた木をコピーして、下の欄に貼る。字下げも記号もない行が見出しになり、そこから次の見出しまでが1本の木になる。貼るたびに新しい木として増える
      </Note>
      <textarea
        value={bulkText}
        onChange={(event) => setBulkText(event.target.value)}
        rows={10}
        placeholder={BULK_PLACEHOLDER}
        aria-label="まとめて取り込むアウトライン"
        spellCheck={false}
        autoCapitalize="off"
        className="mt-2 w-full rounded border border-rule bg-white p-3 font-gothic text-base leading-[1.7] text-sumi placeholder:text-rule"
      />
      {bulkRoots.length > 0 && (
        <ul className="mt-2 rounded border border-rule px-3 py-2">
          {bulkRoots.map((root) => (
            <li key={root.id} className="flex items-baseline justify-between gap-3 py-0.5">
              <span className="font-mincho text-base leading-[1.6] text-sumi">{root.text}</span>
              <span className="shrink-0 font-gothic text-xs text-usuzumi">
                {countNodes(root)} 節
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button kind="solid" className="mt-3" onClick={importBulk} disabled={bulkRoots.length === 0}>
        {bulkRoots.length > 0 ? `${bulkRoots.length} 本の木を取り込む` : '木を取り込む'}
      </Button>

      <SectionTitle>バックアップと引っ越し</SectionTitle>
      <Note>
        木と展開の記録はこの端末の中にしかない。「書き出す」で控えのファイルを1つ作れる。別の端末や、データが消えたあとに「読み込む」と元に戻る。読み込んでも手元の木は消えない
      </Note>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={exportAll}>控えを書き出す</Button>
        <Button onClick={() => fileInput.current?.click()}>控えを読み込む</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={importFile}
        />
      </div>
    </div>
  );
}
