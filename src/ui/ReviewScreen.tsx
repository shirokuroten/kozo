import { useState } from 'react';
import { repository } from '../data';
import { plainText } from '../domain/links';
import { applyReview, summarize, type Grades } from '../domain/review';
import type { Node, Tree } from '../domain/types';
import { Button } from './Button';
import { useI18n } from './i18n';
import { NotFound } from './Note';
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
  today: string;
  onChanged: () => Promise<void>;
}

export function ReviewScreen({ tree, today, onChanged }: Props) {
  const { t } = useI18n();
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [grades, setGrades] = useState<Grades>({});
  const [saving, setSaving] = useState(false);
  const { total, graded, correct, finished } = summarize(tree.root, grades);

  if (total === 0) return <NotFound>{t.review.noNodes}</NotFound>;

  const save = async () => {
    setSaving(true);
    const result = applyReview(tree, grades, today, new Date().toISOString());
    await repository.saveReview(result.tree, result.log);
    await onChanged();
    navigate({ name: 'home' });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between font-gothic text-sm text-usuzumi">
        <span aria-label={t.review.progressLabel(graded, total)}>
          {graded} / {total}
        </span>
        <Button kind="text" onClick={() => navigate({ name: 'home' })}>
          {t.review.stop}
        </Button>
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
            {t.review.saveResult}
          </Button>
        </div>
      )}
    </div>
  );
}
