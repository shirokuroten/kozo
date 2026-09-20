import { useEffect, useMemo, useRef, useState } from 'react';
import { repository } from '../data';
import { mergeStats } from '../domain/mergeStats';
import { parseOutline, toOutline } from '../domain/outline';
import { applyEdit, createTree } from '../domain/tree';
import type { Tree } from '../domain/types';
import { Button } from './Button';
import { Note } from './Note';
import { navigate, setNavigationGuard } from './route';
import { TreeView } from './TreeView';

const PLACEHOLDER = `見出し
  枝
    内容
  枝
    内容`;

interface Props {
  tree?: Tree;
  onChanged: () => Promise<void>;
}

export function EditScreen({ tree, onChanged }: Props) {
  const initialText = useMemo(() => (tree ? toOutline(tree.root) : ''), [tree]);
  const [text, setText] = useState(initialText);
  const parsed = useMemo(() => parseOutline(text), [text]);
  // Lets the user check by color, while writing, which nodes will keep their stats after saving
  const preview = useMemo(
    () => (parsed && tree ? mergeStats(tree.root, parsed) : parsed),
    [parsed, tree],
  );
  const dirty = text !== initialText;
  // Do not show the confirmation for the navigation that happens right after saving
  const saved = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const confirmLeave = () => saved.current || window.confirm('保存していない。このまま離れる');
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saved.current) event.preventDefault();
    };
    setNavigationGuard(confirmLeave);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      setNavigationGuard(null);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);

  const back = () => navigate(tree ? { name: 'view', id: tree.id } : { name: 'home' });

  const save = async () => {
    if (!parsed) return;
    const now = new Date().toISOString();
    const next = tree ? applyEdit(tree, parsed, now) : createTree(parsed, now);
    await repository.saveTree(next);
    saved.current = true;
    await onChanged();
    navigate({ name: 'view', id: next.id });
  };

  return (
    <div>
      <Note>1行目が見出し。行頭の空白2つ（または全角空白）で1段深くなる</Note>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={12}
        placeholder={PLACEHOLDER}
        aria-label="アウトライン"
        spellCheck={false}
        autoCapitalize="off"
        className="mt-2 w-full rounded border border-rule bg-white p-3 font-gothic text-base leading-[1.7] text-sumi placeholder:text-rule"
      />
      {preview && (
        <div className="mt-4 rounded border border-rule p-3">
          <TreeView node={preview} />
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button kind="solid" onClick={save} disabled={!preview}>
          この木を保存
        </Button>
        <Button onClick={back}>戻る</Button>
      </div>
    </div>
  );
}
