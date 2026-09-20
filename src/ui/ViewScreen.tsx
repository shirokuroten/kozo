import { useState } from 'react';
import { repository } from '../data';
import { toMarkdown } from '../domain/portable';
import { formatDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { useI18n } from './i18n';
import { navigate } from './route';
import { TreePath, TreeView } from './TreeView';

interface Props {
  tree: Tree;
  today: string;
  onChanged: () => Promise<void>;
}

export function ViewScreen({ tree, today, onChanged }: Props) {
  const { lang, t } = useI18n();
  const { due, interval } = tree.srs;

  const [copied, setCopied] = useState(false);

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(toMarkdown(tree.root));
    setCopied(true);
  };

  const remove = async () => {
    if (!window.confirm(t.view.confirmRemove(tree.root.text))) return;
    await repository.deleteTree(tree.id);
    await onChanged();
    navigate({ name: 'home' });
  };

  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        {t.common.back}
      </Button>
      <TreePath tree={tree} />
      <TreeView node={tree.root} />
      <p className="mt-4 font-gothic text-xs text-usuzumi">
        {due === null
          ? t.row.neverReviewed
          : t.view.nextDueEvery(formatDue(due, today, lang), interval)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button kind="solid" onClick={() => navigate({ name: 'review', id: tree.id })}>
          {t.view.reviewNow}
        </Button>
        <Button onClick={() => navigate({ name: 'edit', id: tree.id })}>{t.view.edit}</Button>
        <Button onClick={copyMarkdown}>{copied ? t.view.copied : t.view.copyMarkdown}</Button>
        <Button onClick={remove}>{t.view.remove}</Button>
      </div>
    </div>
  );
}
