import type { ReactNode } from 'react';
import { countLastMissed, countNodes, formatDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { useI18n } from './i18n';
import { navigate } from './route';
import { TreePath } from './TreeView';

interface Props {
  tree: Tree;
  today: string;
  // Inside the shelf the location is already visible from the nesting, so the row does not show it
  showPath?: boolean;
  // In the due list, reviewing is the main action. In the shelf, looking things up is the main action, so the review button is toned down
  emphasizeReview?: boolean;
  children?: ReactNode;
}

export function TreeRow({
  tree,
  today,
  showPath = false,
  emphasizeReview = false,
  children,
}: Props) {
  const { lang, t } = useI18n();
  const missed = countLastMissed(tree.root);
  const { due } = tree.srs;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-rule py-3">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => navigate({ name: 'view', id: tree.id })}
      >
        {showPath && <TreePath tree={tree} />}
        <div className="font-mincho text-[17px] leading-[1.6] text-sumi">{tree.root.text}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 font-gothic text-xs text-usuzumi">
          <span>{t.common.nodeCount(countNodes(tree.root))}</span>
          {missed > 0 && <span className="text-shu">{t.row.missedLast(missed)}</span>}
          {due === null && <span>{t.row.neverReviewed}</span>}
          {due !== null && due > today && <span>{t.row.nextDue(formatDue(due, today, lang))}</span>}
        </div>
        {children}
      </button>
      <Button
        kind={emphasizeReview ? 'solid' : 'ghost'}
        className="shrink-0"
        onClick={() => navigate({ name: 'review', id: tree.id })}
      >
        {t.row.review}
      </Button>
    </li>
  );
}
