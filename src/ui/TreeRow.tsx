import type { ReactNode } from 'react';
import { countLastMissed, countNodes, formatDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
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
          <span>{countNodes(tree.root)} 節</span>
          {missed > 0 && <span className="text-shu">前回 {missed} 節で落ちた</span>}
          {due === null && <span>まだ一度も展開していない</span>}
          {due !== null && due > today && <span>次の出番 {formatDue(due, today)}</span>}
        </div>
        {children}
      </button>
      <Button
        kind={emphasizeReview ? 'solid' : 'ghost'}
        className="shrink-0"
        onClick={() => navigate({ name: 'review', id: tree.id })}
      >
        展開
      </Button>
    </li>
  );
}
