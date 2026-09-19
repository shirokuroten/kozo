import { useCallback, useEffect, useState } from 'react';
import { repository } from './data';
import { toLocalDate } from './domain/tree';
import type { Tree } from './domain/types';
import { Home } from './ui/Home';
import { NotFound, Note } from './ui/Note';
import { useRoute, type Route } from './ui/route';

function renderScreen(route: Route, trees: Tree[]) {
  // 日付をまたいで開きっぱなしでも、画面を移るたびに今日を取り直す
  const today = toLocalDate(new Date());
  if (route.name === 'home') return <Home trees={trees} today={today} />;
  return <NotFound>この画面はまだない</NotFound>;
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
    <main className="mx-auto min-h-screen max-w-[520px] px-5 py-6">
      {failed ? (
        <Note>端末内のデータを開けなかった。ブラウザの設定で保存が禁止されていないか確認する</Note>
      ) : trees === null ? (
        <Note>読み込み中</Note>
      ) : (
        renderScreen(route, trees)
      )}
    </main>
  );
}
