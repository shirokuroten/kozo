import { useCallback, useEffect, useState } from 'react';
import { repository } from './data';
import { toLocalDate } from './domain/tree';
import type { ReviewLog, Tree } from './domain/types';
import { DataScreen } from './ui/DataScreen';
import { DueScreen } from './ui/DueScreen';
import { EditScreen } from './ui/EditScreen';
import { HistoryScreen } from './ui/HistoryScreen';
import { Home } from './ui/Home';
import { useI18n, type Messages } from './ui/i18n';
import { NotFound, Note } from './ui/Note';
import { ReviewScreen } from './ui/ReviewScreen';
import { clearQueue } from './ui/reviewQueue';
import { useRoute, type Route } from './ui/route';
import { ViewScreen } from './ui/ViewScreen';

function renderScreen(
  route: Route,
  trees: Tree[],
  logs: ReviewLog[],
  reload: () => Promise<void>,
  t: Messages,
) {
  // Recompute today on every screen change, in case the app stays open across midnight
  const today = toLocalDate(new Date());
  if (route.name === 'home') {
    return <Home trees={trees} hasHistory={logs.length > 0} today={today} onChanged={reload} />;
  }
  if (route.name === 'new') return <EditScreen key="new" onChanged={reload} />;
  if (route.name === 'due') return <DueScreen trees={trees} today={today} />;
  if (route.name === 'history') return <HistoryScreen logs={logs} trees={trees} today={today} />;
  if (route.name === 'data') return <DataScreen today={today} onChanged={reload} />;

  const tree = trees.find((t) => t.id === route.id);
  if (!tree) return <NotFound>{t.common.treeNotFound}</NotFound>;
  if (route.name === 'view')
    return <ViewScreen tree={tree} trees={trees} logs={logs} today={today} onChanged={reload} />;
  if (route.name === 'edit') return <EditScreen key={tree.id} tree={tree} onChanged={reload} />;
  return <ReviewScreen key={tree.id} tree={tree} trees={trees} today={today} onChanged={reload} />;
}

export default function App() {
  const route = useRoute();
  const { t } = useI18n();
  const [trees, setTrees] = useState<Tree[] | null>(null);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    // Everything that changes trees (a saved review, an import) can also add logs, so both are read together
    const [nextTrees, nextLogs] = await Promise.all([
      repository.listTrees(),
      repository.listReviewLogs(),
    ]);
    setLogs(nextLogs);
    setTrees(nextTrees);
  }, []);

  useEffect(() => {
    repository
      .ensureSample(new Date().toISOString())
      .then(reload)
      .catch(() => setFailed(true));
  }, [reload]);

  // A queue runs only from review screen to review screen. Leaving that chain (browser back, a
  // link to another screen) ends it, so it cannot take over a review started later on its own
  const inReview = route.name === 'review';
  useEffect(() => {
    if (!inReview) clearQueue();
  }, [inReview]);

  return (
    <main className="mx-auto min-h-screen max-w-[520px] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {failed ? (
        <Note>{t.common.dbFailed}</Note>
      ) : trees === null ? (
        <Note>{t.common.loading}</Note>
      ) : (
        renderScreen(route, trees, logs, reload, t)
      )}
    </main>
  );
}
