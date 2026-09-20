import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { repository } from '../data';
import { parseOutline } from '../domain/outline';
import { buildExport, parseImport, splitOutlines } from '../domain/portable';
import { countNodes, createTree } from '../domain/tree';
import type { Node } from '../domain/types';
import { Button } from './Button';
import { useI18n } from './i18n';
import { GoogleSection } from './GoogleSection';
import { Note } from './Note';
import { navigate } from './route';

interface Props {
  today: string;
  onChanged: () => Promise<void>;
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mt-8 mb-1 font-gothic text-sm text-sumi">{children}</h2>;
}

export function DataScreen({ today, onChanged }: Props) {
  const { t } = useI18n();
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
    setMessage(t.data.exported(trees.length));
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
      setMessage(t.data.imported(result.trees, result.trees < trees.length));
    } catch (error) {
      setMessage(t.data.importFailed(error instanceof Error ? error.message : ''));
    }
  };

  const importBulk = async () => {
    const now = new Date().toISOString();
    await repository.addTrees(bulkRoots.map((root: Node) => createTree(root, now)));
    await onChanged();
    setMessage(t.data.pasted(bulkRoots.length));
    setBulkText('');
  };

  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        {t.common.back}
      </Button>
      <h1 className="font-mincho text-[20px] leading-[1.6] text-sumi">{t.home.data}</h1>
      <Note>{t.data.intro}</Note>
      <p role="status" className="mt-2 min-h-5 font-gothic text-sm whitespace-pre-line text-sumi">
        {message}
      </p>

      <SectionTitle>{t.data.googleTitle}</SectionTitle>
      <GoogleSection onChanged={onChanged} onMessage={setMessage} />

      <SectionTitle>{t.data.pasteTitle}</SectionTitle>
      <Note>{t.data.pasteNote}</Note>
      <textarea
        value={bulkText}
        onChange={(event) => setBulkText(event.target.value)}
        rows={10}
        placeholder={t.data.pastePlaceholder}
        aria-label={t.data.pasteLabel}
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
                {t.common.nodeCount(countNodes(root))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button kind="solid" className="mt-3" onClick={importBulk} disabled={bulkRoots.length === 0}>
        {t.data.importTrees(bulkRoots.length)}
      </Button>

      <SectionTitle>{t.data.backupTitle}</SectionTitle>
      <Note>{t.data.backupNote}</Note>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={exportAll}>{t.data.exportBackup}</Button>
        <Button onClick={() => fileInput.current?.click()}>{t.data.importBackup}</Button>
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
