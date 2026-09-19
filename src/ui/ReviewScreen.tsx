import { useState } from 'react';
import { repository } from '../data';
import { applyReview, summarize, type Grades } from '../domain/review';
import type { Node, Tree } from '../domain/types';
import { Button } from './Button';
import { NotFound } from './Note';
import { navigate } from './route';
import { Indent, nodeTextClass } from './TreeView';

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
  const tone = value
    ? selected
      ? 'border-koke bg-koke text-white'
      : 'border-koke bg-white text-koke'
    : selected
      ? 'border-shu bg-shu text-white'
      : 'border-shu bg-white text-shu';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={value ? '言えた' : '言えなかった'}
      aria-pressed={selected}
      className={`h-9 w-9 rounded-full border text-base leading-none ${tone}`}
    >
      {value ? '○' : '×'}
    </button>
  );
}

function ReviewNode({ node, depth, opened, grades, onOpen, onGrade }: NodeProps) {
  const grade = grades[node.id];
  const hasChildren = node.children.length > 0;
  const isOpen = opened.has(node.id);
  // 採点前の節の下には子を出さない。上から順に展開する動きを崩さないため
  const canOpen = depth === 0 || grade !== undefined;

  return (
    <Indent depth={depth}>
      <div className="flex items-start justify-between gap-3 py-1">
        <div className={`${nodeTextClass(depth)} ${grade === false ? 'text-shu' : 'text-sumi'}`}>
          {node.text}
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
          className="my-1 ml-[14px] rounded border border-dashed border-rule bg-white px-3 py-2 text-left font-gothic text-sm text-usuzumi"
        >
          枝が {node.children.length} 本。思い出してから開く
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
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [grades, setGrades] = useState<Grades>({});
  const [saving, setSaving] = useState(false);
  const { total, graded, correct, finished } = summarize(tree.root, grades);

  if (total === 0) return <NotFound>この木にはまだ節がない。編集で枝を書いてから展開する</NotFound>;

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
        <span aria-label={`採点済み ${graded}、全 ${total} 節`}>
          {graded} / {total}
        </span>
        <Button kind="text" onClick={() => navigate({ name: 'home' })}>
          中断
        </Button>
      </div>

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
            {correct === total
              ? `${total} / ${total} が言えた。木が丸ごと再現できている`
              : `${correct} / ${total} が言えた。落ちた節は次回、木の上で朱色で表示される`}
          </p>
          <Button kind="solid" className="mt-3" onClick={save} disabled={saving}>
            結果を保存
          </Button>
        </div>
      )}
    </div>
  );
}
