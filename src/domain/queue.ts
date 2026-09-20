import type { ShelfGroup } from './shelf';
import { countNodes } from './tree';

// The order must be the one the shelf shows, top to bottom (subgroups first, then the group's own
// trees), so that "review this chapter" walks the chapter the way the user reads it.
// A tree without nodes has nothing to grade, and would only stop the queue on a dead end
export function shelfTreeIds(group: ShelfGroup): string[] {
  return [
    ...group.groups.flatMap(shelfTreeIds),
    ...group.trees.filter((tree) => countNodes(tree.root) > 0).map((tree) => tree.id),
  ];
}

// index is zero based. null means the tree is being reviewed on its own, outside the queue
export function queuePosition(
  queue: string[],
  currentId: string,
): { index: number; total: number } | null {
  const index = queue.indexOf(currentId);
  return index === -1 ? null : { index, total: queue.length };
}

// A sync or a delete can remove a queued tree while the queue is running, so those are passed over
export function nextInQueue(
  queue: string[],
  currentId: string,
  existingIds: Set<string>,
): string | null {
  const index = queue.indexOf(currentId);
  if (index === -1) return null;
  return queue.slice(index + 1).find((id) => existingIds.has(id)) ?? null;
}
