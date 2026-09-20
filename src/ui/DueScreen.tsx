import { countNodes, partitionByDue } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { useI18n } from './i18n';
import { Note } from './Note';
import { startQueue } from './reviewQueue';
import { navigate } from './route';
import { TreeRow } from './TreeRow';

// A list ordered by spaced repetition. This screen is for deciding which tree to open first when the user wants to review
export function DueScreen({ trees, today }: { trees: Tree[]; today: string }) {
  const { t } = useI18n();
  const { dueToday, later } = partitionByDue(trees, today);
  // A tree without nodes has nothing to grade, so it would only interrupt the run
  const queueIds = dueToday.filter((tree) => countNodes(tree.root) > 0).map((tree) => tree.id);
  return (
    <div>
      <Button kind="text" className="mb-2" onClick={() => navigate({ name: 'home' })}>
        {t.common.back}
      </Button>
      <h1 className="font-mincho text-[20px] leading-[1.6] text-sumi">{t.due.title}</h1>
      <Note>{t.due.note}</Note>

      <section className="mt-6 mb-6">
        <h2 className="mb-1 font-gothic text-sm text-sumi">{t.due.dueNow(dueToday.length)}</h2>
        {queueIds.length >= 2 && (
          <Button kind="text" onClick={() => startQueue(queueIds)}>
            {t.queue.reviewDue(queueIds.length)}
          </Button>
        )}
        <ul>
          {dueToday.map((tree) => (
            <TreeRow key={tree.id} tree={tree} today={today} showPath />
          ))}
        </ul>
      </section>

      {later.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 font-gothic text-sm text-usuzumi">{t.due.later}</h2>
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
