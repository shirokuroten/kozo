import { useCallback, useEffect, useState } from 'react';
import { repository } from './data';
import { toLocalDate } from './domain/tree';
import type { Tree } from './domain/types';
import { DataScreen } from './ui/DataScreen';
import { DueScreen } from './ui/DueScreen';
import { EditScreen } from './ui/EditScreen';
import { Home } from './ui/Home';
import { NotFound, Note } from './ui/Note';
import { ReviewScreen } from './ui/ReviewScreen';
import { useRoute, type Route } from './ui/route';
import { ViewScreen } from './ui/ViewScreen';

function renderScreen(route: Route, trees: Tree[], reload: () => Promise<void>) {
  // Recompute today on every screen change, in case the app stays open across midnight
  const today = toLocalDate(new Date());
  if (route.name === 'home') return <Home trees={trees} today={today} onChanged={reload} />;
  if (route.name === 'new') return <EditScreen key="new" onChanged={reload} />;
  if (route.name === 'due') return <DueScreen trees={trees} today={today} />;
  if (route.name === 'data') return <DataScreen today={today} onChanged={reload} />;

  const tree = trees.find((t) => t.id === route.id);
  if (!tree) return <NotFound>この木は見つからない</NotFound>;
  if (route.name === 'view') return <ViewScreen tree={tree} today={today} onChanged={reload} />;
  if (route.name === 'edit') return <EditScreen key={tree.id} tree={tree} onChanged={reload} />;
  return <ReviewScreen key={tree.id} tree={tree} today={today} onChanged={reload} />;
}

export default function App() {
  const route = useRoute();
  const [trees, setTrees] = useState<Tree[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    setTrees(await repository.listTrees());
  }, []);

  useEffect(() => {
    repository
      .ensureSample(new Date().toISOString())
      .then(reload)
      .catch(() => setFailed(true));
  }, [reload]);

  return (
    <main className="mx-auto min-h-screen max-w-[520px] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {failed ? (
        <Note>端末内のデータを開けなかった。ブラウザの設定で保存が禁止されていないか確認する</Note>
      ) : trees === null ? (
        <Note>読み込み中</Note>
      ) : (
        renderScreen(route, trees, reload)
      )}
    </main>
  );
}
