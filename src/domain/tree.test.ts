import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';
import {
  countLastMissed,
  countNodes,
  createTree,
  formatDue,
  nodeTone,
  partitionByDue,
  toLocalDate,
} from './tree';
import type { Tree } from './types';

const root = () => parseOutline('根\n  枝A\n    葉A\n  枝B')!;

function treeWith(id: string, due: string | null, createdAt = '2026-09-01T00:00:00.000Z'): Tree {
  const tree = createTree(root(), createdAt);
  return { ...tree, id, srs: { ...tree.srs, due } };
}

describe('countNodes', () => {
  it('根を除いた節の数を返す', () => {
    expect(countNodes(root())).toBe(3);
    expect(countNodes(parseOutline('根だけ')!)).toBe(0);
  });
});

describe('countLastMissed', () => {
  it('前回落ちた節だけを数える', () => {
    const r = root();
    r.children[0].lastResult = false;
    r.children[0].children[0].lastResult = false;
    r.children[1].lastResult = true;
    r.children[1].missCount = 3;
    expect(countLastMissed(r)).toBe(2);
  });
});

describe('nodeTone', () => {
  it('前回落ちた節は朱、過去に落ちた節は黄土、それ以外は墨', () => {
    const n = root();
    expect(nodeTone(n)).toBe('sumi');
    expect(nodeTone({ ...n, missCount: 2, lastResult: true })).toBe('oudo');
    expect(nodeTone({ ...n, missCount: 2, lastResult: false })).toBe('shu');
    expect(nodeTone({ ...n, missCount: 2, lastResult: null })).toBe('oudo');
  });
});

describe('createTree', () => {
  it('未展開の木を作る', () => {
    const tree = createTree(root(), '2026-09-19T01:02:03.000Z');
    expect(tree.srs.due).toBeNull();
    expect(tree.createdAt).toBe('2026-09-19T01:02:03.000Z');
    expect(tree.updatedAt).toBe(tree.createdAt);
    expect(tree.id).not.toBe('');
  });
});

describe('partitionByDue', () => {
  it('期日が今日以前の木と未展開の木を「今日」に、それ以外を「この先」に分ける', () => {
    const trees = [
      treeWith('future', '2026-09-25'),
      treeWith('today', '2026-09-19'),
      treeWith('never', null),
      treeWith('overdue', '2026-09-10'),
      treeWith('tomorrow', '2026-09-20'),
    ];
    const { dueToday, later } = partitionByDue(trees, '2026-09-19');
    // 遅れている木を先に、未展開の木は最後に
    expect(dueToday.map((t) => t.id)).toEqual(['overdue', 'today', 'never']);
    expect(later.map((t) => t.id)).toEqual(['tomorrow', 'future']);
  });

  it('未展開の木どうしは作った順に並べる', () => {
    const trees = [
      treeWith('b', null, '2026-09-02T00:00:00.000Z'),
      treeWith('a', null, '2026-09-01T00:00:00.000Z'),
    ];
    expect(partitionByDue(trees, '2026-09-19').dueToday.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('toLocalDate', () => {
  it('端末の暦日を YYYY-MM-DD で返す', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('formatDue', () => {
  it('今年の日付は月日だけ、年が違えば年も出す', () => {
    expect(formatDue('2026-09-05', '2026-09-19')).toBe('9月5日');
    expect(formatDue('2027-01-05', '2026-12-28')).toBe('2027年1月5日');
  });
});
