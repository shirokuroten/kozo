import { countLastMissed, countNodes, formatDue, partitionByDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { HomeSync } from './HomeSync';
import { navigate } from './route';
import { TreePath } from './TreeView';

function Row({ tree, today }: { tree: Tree; today: string }) {
  const missed = countLastMissed(tree.root);
  const { due } = tree.srs;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-rule py-3">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => navigate({ name: 'view', id: tree.id })}
      >
        <TreePath tree={tree} />
        <div className="font-mincho text-[17px] leading-[1.6] text-sumi">{tree.root.text}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 font-gothic text-xs text-usuzumi">
          <span>{countNodes(tree.root)} 節</span>
          {missed > 0 && <span className="text-shu">前回 {missed} 節で落ちた</span>}
          {due === null && <span>まだ一度も展開していない</span>}
          {due !== null && due > today && <span>次の出番 {formatDue(due, today)}</span>}
        </div>
      </button>
      <Button
        kind="solid"
        className="shrink-0"
        onClick={() => navigate({ name: 'review', id: tree.id })}
      >
        展開
      </Button>
    </li>
  );
}

interface Props {
  trees: Tree[];
  today: string;
  onChanged: () => Promise<void>;
}

export function Home({ trees, today, onChanged }: Props) {
  const { dueToday, later } = partitionByDue(trees, today);
  return (
    <div>
      <h1 className="font-mincho text-[26px] tracking-[2px] text-sumi">構造</h1>
      <p className="mt-1 mb-6 font-gothic text-sm text-usuzumi">
        木を上から展開して、自分で再現する
      </p>

      <HomeSync onChanged={onChanged} />

      {trees.length === 0 && (
        <p className="mb-4 font-mincho text-base text-sumi">まだ木がない。最初の1本を作る</p>
      )}

      {dueToday.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 font-gothic text-sm text-sumi">今日展開する {dueToday.length} 本</h2>
          <ul>
            {dueToday.map((tree) => (
              <Row key={tree.id} tree={tree} today={today} />
            ))}
          </ul>
        </section>
      )}

      {later.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 font-gothic text-sm text-usuzumi">この先</h2>
          <ul>
            {later.map((tree) => (
              <Row key={tree.id} tree={tree} today={today} />
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button kind="solid" onClick={() => navigate({ name: 'new' })}>
          新しい木を作る
        </Button>
        <Button kind="text" onClick={() => navigate({ name: 'data' })}>
          取り込みとバックアップ
        </Button>
      </div>
    </div>
  );
}
