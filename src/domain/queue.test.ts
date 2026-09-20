import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';
import { nextInQueue, queuePosition, shelfTreeIds } from './queue';
import { buildShelf } from './shelf';
import { createTree } from './tree';
import type { Tree } from './types';

let clock = 0;
function manual(outline: string): Tree {
  clock += 1;
  return createTree(
    parseOutline(outline)!,
    `2026-09-01T00:00:${String(clock).padStart(2, '0')}.000Z`,
  );
}
function synced(outline: string, docTitle: string, path: string[], order: number): Tree {
  return { ...manual(outline), source: { kind: 'gdoc', docId: docTitle, docTitle, path, order } };
}

describe('shelfTreeIds', () => {
  const a = synced('A\n  a', 'Book', ['Part 1', 'Chapter 1'], 0);
  const b = synced('B\n  b', 'Book', ['Part 1', 'Chapter 1'], 1);
  const c = synced('C\n  c', 'Book', ['Part 1'], 2);
  const d = synced('D\n  d', 'Book', ['Part 2'], 3);
  const empty = synced('Empty', 'Book', ['Part 1', 'Chapter 1'], 4);
  const hand = manual('Hand\n  h');
  const shelf = buildShelf([d, hand, c, empty, b, a]);

  it('follows the order the shelf renders: subgroups first, then the trees of the group', () => {
    expect(shelfTreeIds(shelf)).toEqual([a.id, b.id, c.id, d.id, hand.id]);
  });

  it('lists only the trees under the given group', () => {
    const part1 = shelf.groups[0].groups[0];
    expect(part1.name).toBe('Part 1');
    expect(shelfTreeIds(part1)).toEqual([a.id, b.id, c.id]);
    expect(shelfTreeIds(part1.groups[0])).toEqual([a.id, b.id]);
  });

  it('leaves out trees that have no nodes', () => {
    expect(shelfTreeIds(shelf)).not.toContain(empty.id);
    expect(shelfTreeIds(buildShelf([empty]))).toEqual([]);
  });
});

describe('queuePosition', () => {
  it('gives the zero based index and the total', () => {
    expect(queuePosition(['a', 'b', 'c'], 'a')).toEqual({ index: 0, total: 3 });
    expect(queuePosition(['a', 'b', 'c'], 'c')).toEqual({ index: 2, total: 3 });
  });

  it('is null when the tree is not queued or there is no queue', () => {
    expect(queuePosition(['a', 'b'], 'x')).toBeNull();
    expect(queuePosition([], 'a')).toBeNull();
  });
});

describe('nextInQueue', () => {
  const all = new Set(['a', 'b', 'c']);

  it('gives the id after the current one', () => {
    expect(nextInQueue(['a', 'b', 'c'], 'a', all)).toBe('b');
    expect(nextInQueue(['a', 'b', 'c'], 'b', all)).toBe('c');
  });

  it('is null after the last tree', () => {
    expect(nextInQueue(['a', 'b', 'c'], 'c', all)).toBeNull();
  });

  it('is null when the current tree is not queued', () => {
    expect(nextInQueue(['a', 'b'], 'x', all)).toBeNull();
    expect(nextInQueue([], 'a', all)).toBeNull();
  });

  it('skips ids that no longer exist', () => {
    expect(nextInQueue(['a', 'b', 'c'], 'a', new Set(['a', 'c']))).toBe('c');
    expect(nextInQueue(['a', 'b', 'c'], 'a', new Set(['a']))).toBeNull();
  });
});
