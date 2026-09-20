import { partitionByDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { Note } from './Note';
import { navigate } from './route';
import { TreeRow } from './TreeRow';

// 間隔反復の順に並べた一覧。復習したいときに、どの木から開くかを決めるための画面
export function DueScreen({ trees, today }: { trees: Tree[]; today: string }) {
  const { dueToday, later } = partitionByDue(trees, today);
  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        戻る
      </Button>
      <h1 className="font-mincho text-[20px] leading-[1.6] text-sumi">出番</h1>
      <Note>
        前に落ちた節が多い木ほど早く出番が来る。全部やる必要はない。時間のあるときに上から開く
      </Note>

      <section className="mt-6 mb-6">
        <h2 className="mb-1 font-gothic text-sm text-sumi">出番が来ている {dueToday.length} 本</h2>
        <ul>
          {dueToday.map((tree) => (
            <TreeRow key={tree.id} tree={tree} today={today} showPath emphasizeReview />
          ))}
        </ul>
      </section>

      {later.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 font-gothic text-sm text-usuzumi">この先</h2>
          <ul>
            {later.map((tree) => (
              <TreeRow key={tree.id} tree={tree} today={today} showPath />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
