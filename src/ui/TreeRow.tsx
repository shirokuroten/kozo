import type { ReactNode } from 'react';
import { plainText } from '../domain/links';
import { countLastMissed, countNodes, formatDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { useI18n } from './i18n';
import { Menu } from './Menu';
import { navigate } from './route';
import { TreePath } from './TreeView';

interface Props {
  tree: Tree;
  today: string;
  // Inside the shelf the location is already visible from the nesting, so the row does not show it
  showPath?: boolean;
  // Pressing the row starts a review, because that is what the user does most.
  // Search results open the whole tree instead: someone who searches wants to read the answer, not be asked for it
  opens?: 'review' | 'view';
  children?: ReactNode;
}

export function TreeRow({ tree, today, showPath = false, opens = 'review', children }: Props) {
  const { lang, t } = useI18n();
  const missed = countLastMissed(tree.root);
  const { due } = tree.srs;
  return (
    <li className="flex items-center justify-between gap-2 border-b border-rule py-3">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => navigate({ name: opens, id: tree.id })}
      >
        {showPath && <TreePath tree={tree} />}
        <div className="font-mincho text-[17px] leading-[1.6] text-sumi">
          {plainText(tree.root.text)}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 font-gothic text-xs text-usuzumi">
          <span>{t.common.nodeCount(countNodes(tree.root))}</span>
          {missed > 0 && <span className="text-shu">{t.row.missedLast(missed)}</span>}
          {due === null && <span>{t.row.neverReviewed}</span>}
          {due !== null && due > today && <span>{t.row.nextDue(formatDue(due, today, lang))}</span>}
        </div>
        {children}
      </button>
      <Menu
        items={[
          opens === 'review'
            ? { label: t.menu.view, onSelect: () => navigate({ name: 'view', id: tree.id }) }
            : {
                label: t.view.reviewNow,
                onSelect: () => navigate({ name: 'review', id: tree.id }),
              },
          { label: t.view.edit, onSelect: () => navigate({ name: 'edit', id: tree.id }) },
        ]}
      />
    </li>
  );
}
