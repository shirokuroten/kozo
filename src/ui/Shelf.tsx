import { useState } from 'react';
import { shelfTreeIds } from '../domain/queue';
import type { ShelfGroup } from '../domain/shelf';
import { Button } from './Button';
import { useI18n } from './i18n';
import { startQueue } from './reviewQueue';
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

// Reviewing a whole chapter or part is the main way in, but it is shown only inside an open group,
// so a shelf of closed rows stays a plain list of names
function ReviewGroup({ group, depth }: { group: ShelfGroup; depth: number }) {
  const { t } = useI18n();
  const ids = shelfTreeIds(group);
  // A single tree already has its own review button right below
  if (ids.length < 2) return null;
  return (
    <Indent depth={depth}>
      <Button kind="text" onClick={() => startQueue(ids)}>
        {t.queue.reviewGroup(ids.length)}
      </Button>
    </Indent>
  );
}

function Group({ group, depth, today, openKeys, onToggle }: GroupProps) {
  const { t } = useI18n();
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
          <span>{t.shelf.treeCount(group.count)}</span>
          <span>{open ? t.shelf.close : t.shelf.open}</span>
        </span>
      </button>
      {open && <ReviewGroup group={group} depth={depth + 1} />}
      {open && <Contents group={group} depth={depth + 1} {...{ today, openKeys, onToggle }} />}
    </Indent>
  );
}

function Contents({ group, depth, today, openKeys, onToggle }: GroupProps) {
  return (
    <>
      {/* Groups and trees are interleaved in document order. See ShelfGroup.items */}
      {group.items.map((item) =>
        item.kind === 'group' ? (
          <Group
            key={item.group.key}
            group={item.group}
            {...{ depth, today, openKeys, onToggle }}
          />
        ) : (
          <Indent key={item.tree.id} depth={depth}>
            <ul>
              <TreeRow tree={item.tree} today={today} />
            </ul>
          </Indent>
        ),
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
