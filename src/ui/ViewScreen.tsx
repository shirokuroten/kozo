import { useMemo, useState } from 'react';
import { repository } from '../data';
import { treeLogs } from '../domain/history';
import { resolveLink } from '../domain/links';
import { toMarkdown } from '../domain/portable';
import { formatDue, formatShortDate } from '../domain/tree';
import type { ReviewLog, Tree } from '../domain/types';
import { Button } from './Button';
import { describeResult } from './historyText';
import { useI18n } from './i18n';
import { navigate } from './route';
import { HISTORY_LIMIT, TreePath, TreeView } from './TreeView';

interface Props {
  tree: Tree;
  // All trees, to resolve [[links]] written in this tree's nodes
  trees: Tree[];
  // Every review log. Only this tree's are shown
  logs: ReviewLog[];
  today: string;
  onChanged: () => Promise<void>;
}

export function ViewScreen({ tree, trees, logs, today, onChanged }: Props) {
  const { lang, t } = useI18n();
  const { due, interval } = tree.srs;

  const [copied, setCopied] = useState(false);

  // The list and the marks next to the nodes cover the same reviews, so one can be read against
  // the other
  const history = useMemo(
    () => ({ treeId: tree.id, logs: treeLogs(logs, tree.id).slice(-HISTORY_LIMIT) }),
    [logs, tree.id],
  );

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
      <TreeView
        node={tree.root}
        linkTo={(target) => resolveLink(trees, tree, target)?.id}
        history={history}
      />
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

      {history.logs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 font-gothic text-sm text-usuzumi">{t.history.pastReviews}</h2>
          <ul className="font-gothic text-xs text-usuzumi">
            {[...history.logs].reverse().map((log) => (
              <li key={log.id} className="flex gap-x-3 border-b border-rule py-2">
                <span className="w-28 shrink-0">{formatShortDate(log.date, today, lang)}</span>
                <span className={log.ratio < 1 ? 'text-shu' : ''}>{describeResult(t, log)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
