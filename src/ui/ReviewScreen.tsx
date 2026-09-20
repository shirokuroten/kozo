import { useEffect, useMemo, useState } from 'react';
import { repository } from '../data';
import { plainText } from '../domain/links';
import { nextInQueue, queuePosition } from '../domain/queue';
import { applyReview, summarize, type Grades } from '../domain/review';
import type { Node, Tree } from '../domain/types';
import { Button } from './Button';
import { useI18n } from './i18n';
import { NotFound } from './Note';
import { clearQueue, loadQueue } from './reviewQueue';
import { navigate } from './route';
import { Indent, nodeTextClass, TreePath } from './TreeView';

interface NodeProps {
  node: Node;
  depth: number;
  opened: ReadonlySet<string>;
  grades: Grades;
  onOpen: (id: string) => void;
  onGrade: (id: string, value: boolean) => void;
}

function GradeButton({
  value,
  selected,
  onClick,
}: {
  value: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const tone = value
    ? selected
      ? 'border-koke bg-koke text-paper'
      : 'border-koke bg-surface text-koke'
    : selected
      ? 'border-shu bg-shu text-paper'
      : 'border-shu bg-surface text-shu';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={value ? t.review.recalled : t.review.missed}
      aria-pressed={selected}
      className={`h-9 w-9 rounded-full border text-base leading-none ${tone}`}
    >
      {value ? '○' : '×'}
    </button>
  );
}

function ReviewNode({ node, depth, opened, grades, onOpen, onGrade }: NodeProps) {
  const { t } = useI18n();
  const grade = grades[node.id];
  const hasChildren = node.children.length > 0;
  const isOpen = opened.has(node.id);
  // Children are not shown under a node that has not been graded yet, to preserve the top-down order of the review
  const canOpen = depth === 0 || grade !== undefined;

  return (
    <Indent depth={depth}>
      <div className="flex items-start justify-between gap-3 py-1">
        <div className={`${nodeTextClass(depth)} ${grade === false ? 'text-shu' : 'text-sumi'}`}>
          {plainText(node.text)}
        </div>
        {depth > 0 && (
          <div className="flex shrink-0 gap-2">
            <GradeButton
              value={true}
              selected={grade === true}
              onClick={() => onGrade(node.id, true)}
            />
            <GradeButton
              value={false}
              selected={grade === false}
              onClick={() => onGrade(node.id, false)}
            />
          </div>
        )}
      </div>

      {hasChildren && canOpen && !isOpen && (
        <button
          type="button"
          onClick={() => onOpen(node.id)}
          className="my-1 ml-[14px] rounded border border-dashed border-rule bg-surface px-3 py-2 text-left font-gothic text-sm text-usuzumi"
        >
          {t.review.expand(node.children.length)}
        </button>
      )}

      {isOpen &&
        node.children.map((child) => (
          <ReviewNode
            key={child.id}
            node={child}
            depth={depth + 1}
            opened={opened}
            grades={grades}
            onOpen={onOpen}
            onGrade={onGrade}
          />
        ))}
    </Indent>
  );
}

interface Props {
  tree: Tree;
  // Needed to pass over queued trees that were deleted while the queue was running
  trees: Tree[];
  today: string;
  onChanged: () => Promise<void>;
}

export function ReviewScreen({ tree, trees, today, onChanged }: Props) {
  const { t } = useI18n();
  // Read once per tree: the screen is remounted for every tree, and nothing edits the queue meanwhile
  const [queue] = useState(loadQueue);
  const existingIds = useMemo(() => new Set(trees.map((other) => other.id)), [trees]);
  const position = queuePosition(
    queue.filter((id) => existingIds.has(id)),
    tree.id,
  );
  const queued = position !== null;
  const nextId = nextInQueue(queue, tree.id, existingIds);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [grades, setGrades] = useState<Grades>({});
  const [saving, setSaving] = useState(false);
  const { total, graded, correct, finished } = summarize(tree.root, grades);

  // A review opened on its own must end at home, so a queue left over from earlier is dropped
  // rather than picked up again by a later save
  useEffect(() => {
    if (!queued) clearQueue();
  }, [queued]);

  if (total === 0) return <NotFound>{t.review.noNodes}</NotFound>;

  const stop = () => {
    clearQueue();
    navigate({ name: 'home' });
  };

  const goNext = () => {
    if (nextId === null) stop();
    else navigate({ name: 'review', id: nextId });
  };

  const save = async () => {
    setSaving(true);
    const result = applyReview(tree, grades, today, new Date().toISOString());
    await repository.saveReview(result.tree, result.log);
    await onChanged();
    goNext();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between font-gothic text-sm text-usuzumi">
        <span className="flex gap-3">
          <span aria-label={t.review.progressLabel(graded, total)}>
            {graded} / {total}
          </span>
          {position && <span>{t.queue.position(position.index + 1, position.total)}</span>}
        </span>
        <span className="flex gap-4">
          {queued && (
            <Button kind="text" onClick={goNext} disabled={saving}>
              {t.queue.skip}
            </Button>
          )}
          <Button kind="text" onClick={stop}>
            {t.review.stop}
          </Button>
        </span>
      </div>

      <TreePath tree={tree} />
      <ReviewNode
        node={tree.root}
        depth={0}
        opened={opened}
        grades={grades}
        onOpen={(id) => setOpened((prev) => new Set([...prev, id]))}
        onGrade={(id, value) => setGrades((prev) => ({ ...prev, [id]: value }))}
      />

      {finished && (
        <div className="mt-8 border-t border-rule pt-4">
          <p className="font-mincho text-base leading-[1.6] text-sumi">
            {correct === total ? t.review.allRecalled(total) : t.review.someMissed(correct, total)}
          </p>
          <Button kind="solid" className="mt-3" onClick={save} disabled={saving}>
            {nextId === null ? t.review.saveResult : t.queue.saveAndNext}
          </Button>
        </div>
      )}
    </div>
  );
}
