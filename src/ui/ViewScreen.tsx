import { repository } from '../data';
import { formatDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { navigate } from './route';
import { TreeView } from './TreeView';

interface Props {
  tree: Tree;
  today: string;
  onChanged: () => Promise<void>;
}

export function ViewScreen({ tree, today, onChanged }: Props) {
  const { due, interval } = tree.srs;

  const remove = async () => {
    if (!window.confirm(`「${tree.root.text}」を削除する。元に戻せない`)) return;
    await repository.deleteTree(tree.id);
    await onChanged();
    navigate({ name: 'home' });
  };

  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        戻る
      </Button>
      <TreeView node={tree.root} />
      <p className="mt-4 font-gothic text-xs text-usuzumi">
        {due === null
          ? 'まだ一度も展開していない'
          : `次の出番 ${formatDue(due, today)}（${interval}日間隔）`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button kind="solid" onClick={() => navigate({ name: 'review', id: tree.id })}>
          今すぐ展開する
        </Button>
        <Button onClick={() => navigate({ name: 'edit', id: tree.id })}>編集</Button>
        <Button onClick={remove}>削除</Button>
      </div>
    </div>
  );
}
