import { useState } from 'react';
import type { ShelfGroup } from '../domain/shelf';
import { TreeRow } from './TreeRow';
import { Indent } from './TreeView';

const STORAGE_KEY = 'kozo:openGroups';

// Which groups are open is a display preference of this device, so it is remembered lightly, apart from the tree data
function loadOpenKeys(fallback: string[]): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {
    // Where storage is unavailable, start from the initial state every time
  }
  return new Set(fallback);
}

function saveOpenKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Failing to remember this does not break anything
  }
}

interface GroupProps {
  group: ShelfGroup;
  depth: number;
  today: string;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
}

function Group({ group, depth, today, openKeys, onToggle }: GroupProps) {
  const open = openKeys.has(group.key);
  return (
    <Indent depth={depth}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(group.key)}
        className="flex w-full items-baseline justify-between gap-3 py-2 text-left"
      >
        <span className="font-mincho text-base leading-[1.6] text-sumi">{group.name}</span>
        <span className="flex shrink-0 gap-3 font-gothic text-xs text-usuzumi">
          <span>{group.count} 本</span>
          <span>{open ? '閉じる' : '開く'}</span>
        </span>
      </button>
      {open && <Contents group={group} depth={depth + 1} {...{ today, openKeys, onToggle }} />}
    </Indent>
  );
}

function Contents({ group, depth, today, openKeys, onToggle }: GroupProps) {
  return (
    <>
      {group.groups.map((child) => (
        <Group key={child.key} group={child} {...{ depth, today, openKeys, onToggle }} />
      ))}
      {group.trees.length > 0 && (
        <Indent depth={depth}>
          <ul>
            {group.trees.map((tree) => (
              <TreeRow key={tree.id} tree={tree} today={today} />
            ))}
          </ul>
        </Indent>
      )}
    </>
  );
}

export function Shelf({ shelf, today }: { shelf: ShelfGroup; today: string }) {
  // Initially only the document level is open, so the list of tabs (the parts of the book) is visible
  const [openKeys, setOpenKeys] = useState(() => loadOpenKeys(shelf.groups.map((g) => g.key)));

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveOpenKeys(next);
      return next;
    });
  };

  return <Contents group={shelf} depth={0} today={today} openKeys={openKeys} onToggle={toggle} />;
}
