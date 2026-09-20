import { describe, expect, it } from 'vitest';
import {
  addMonths,
  buildMonth,
  canGoNext,
  canGoPrev,
  compareMonths,
  logsInMonth,
  logsOn,
  monthOf,
  nodeHistory,
  reviewResult,
  treeLogs,
} from './history';
import type { ReviewLog } from './types';

let nextId = 0;
function log(date: string, extra: Partial<ReviewLog> = {}): ReviewLog {
  nextId += 1;
  return { id: `log${nextId}`, treeId: 't1', date, ratio: 1, missedNodeIds: [], ...extra };
}

describe('month navigation', () => {
  it('reads the month out of a date', () => {
    expect(monthOf('2026-09-20')).toEqual({ year: 2026, month: 9 });
    expect(monthOf('2027-01-05')).toEqual({ year: 2027, month: 1 });
  });

  it('moves across year boundaries', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 9 }, -12)).toEqual({ year: 2025, month: 9 });
    expect(addMonths({ year: 2026, month: 9 }, 0)).toEqual({ year: 2026, month: 9 });
  });

  it('orders months', () => {
    expect(compareMonths({ year: 2026, month: 9 }, { year: 2026, month: 9 })).toBe(0);
    expect(compareMonths({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBeLessThan(0);
    expect(compareMonths({ year: 2026, month: 10 }, { year: 2026, month: 9 })).toBeGreaterThan(0);
  });

  it('never goes past the current month', () => {
    expect(canGoNext({ year: 2026, month: 8 }, '2026-09-20')).toBe(true);
    expect(canGoNext({ year: 2026, month: 9 }, '2026-09-20')).toBe(false);
    expect(canGoNext({ year: 2025, month: 12 }, '2026-01-01')).toBe(true);
    expect(canGoNext({ year: 2026, month: 10 }, '2026-09-20')).toBe(false);
  });

  it('goes back only while an older review exists', () => {
    const logs = [log('2026-07-31'), log('2026-09-01')];
    expect(canGoPrev({ year: 2026, month: 9 }, logs)).toBe(true);
    expect(canGoPrev({ year: 2026, month: 8 }, logs)).toBe(true);
    expect(canGoPrev({ year: 2026, month: 7 }, logs)).toBe(false);
    expect(canGoPrev({ year: 2026, month: 9 }, [])).toBe(false);
  });
});

describe('buildMonth', () => {
  it('lays a month out in Sunday-first weeks padded to seven cells', () => {
    // September 2026 starts on a Tuesday and has 30 days
    const weeks = buildMonth([], 2026, 9);
    expect(weeks).toHaveLength(5);
    for (const week of weeks) expect(week).toHaveLength(7);
    expect(weeks[0].map((c) => c.date)).toEqual([
      null,
      null,
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ]);
    expect(weeks[4].map((c) => c.date)).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      null,
      null,
      null,
    ]);
  });

  it('handles months that need four or six weeks, and leap years', () => {
    // February 2026 starts on a Sunday and has 28 days
    const feb = buildMonth([], 2026, 2);
    expect(feb).toHaveLength(4);
    expect(feb[0][0].date).toBe('2026-02-01');
    expect(feb[3][6].date).toBe('2026-02-28');
    // August 2026 starts on a Saturday
    const aug = buildMonth([], 2026, 8);
    expect(aug).toHaveLength(6);
    expect(aug[0][6].date).toBe('2026-08-01');
    expect(aug[5][1].date).toBe('2026-08-31');
    const leap = buildMonth([], 2028, 2).flat();
    expect(leap.filter((c) => c.date !== null)).toHaveLength(29);
  });

  it('counts the reviews of each day and flags days with a miss', () => {
    const logs = [
      log('2026-09-05'),
      log('2026-09-05', { treeId: 't2' }),
      log('2026-09-10'),
      log('2026-09-10', { ratio: 0.5, missedNodeIds: ['a'] }),
      // Other months must not leak in, even with the same day number
      log('2026-08-05', { ratio: 0 }),
      log('2027-09-05', { ratio: 0 }),
    ];
    const cells = buildMonth(logs, 2026, 9).flat();
    const at = (date: string) => cells.find((c) => c.date === date)!;
    expect(at('2026-09-05')).toEqual({ date: '2026-09-05', count: 2, missed: false });
    expect(at('2026-09-10')).toEqual({ date: '2026-09-10', count: 2, missed: true });
    expect(at('2026-09-06')).toEqual({ date: '2026-09-06', count: 0, missed: false });
    expect(cells.reduce((sum, c) => sum + c.count, 0)).toBe(4);
  });
});

describe('logsOn and logsInMonth', () => {
  const logs = [log('2026-09-05'), log('2026-09-06'), log('2026-09-05'), log('2026-10-05')];

  it('picks the reviews of one day', () => {
    expect(logsOn(logs, '2026-09-05')).toEqual([logs[0], logs[2]]);
    expect(logsOn(logs, '2026-09-07')).toEqual([]);
  });

  it('orders the reviews of a day by save time, with logs that lack one first', () => {
    const late = log('2026-09-05', { at: '2026-09-05T12:00:00.000Z' });
    const early = log('2026-09-05', { at: '2026-09-05T03:00:00.000Z' });
    const old = log('2026-09-05');
    expect(logsOn([late, early, old], '2026-09-05')).toEqual([old, early, late]);
  });

  it('picks the reviews of one month', () => {
    expect(logsInMonth(logs, { year: 2026, month: 9 })).toEqual([logs[0], logs[1], logs[2]]);
    expect(logsInMonth(logs, { year: 2026, month: 1 })).toEqual([]);
  });
});

describe('treeLogs', () => {
  it('keeps only the tree, oldest first, without reordering reviews of the same day', () => {
    const logs = [
      log('2026-09-10'),
      log('2026-09-01', { treeId: 't2' }),
      log('2026-09-05'),
      log('2026-09-05', { ratio: 0.5 }),
    ];
    expect(treeLogs(logs, 't1')).toEqual([logs[2], logs[3], logs[0]]);
    expect(treeLogs(logs, 'none')).toEqual([]);
    // The input stays as it was
    expect(logs[0].date).toBe('2026-09-10');
  });

  it('orders reviews of the same day by save time', () => {
    const second = log('2026-09-05', { at: '2026-09-05T09:00:00.000Z' });
    const first = log('2026-09-05', { at: '2026-09-05T08:00:00.000Z' });
    const legacy = log('2026-09-05');
    const nextDay = log('2026-09-06', { at: '2026-09-05T23:30:00.000Z' });
    expect(treeLogs([nextDay, second, first, legacy], 't1')).toEqual([
      legacy,
      first,
      second,
      nextDay,
    ]);
  });
});

describe('nodeHistory', () => {
  it('marks each review as recalled, missed or absent, oldest first', () => {
    const logs = [
      log('2026-09-03', { nodeIds: ['a', 'b'], missedNodeIds: ['b'] }),
      log('2026-09-01', { nodeIds: ['a'] }),
      log('2026-09-02', { treeId: 't2', nodeIds: ['a', 'b'], missedNodeIds: ['a', 'b'] }),
    ];
    expect(nodeHistory(logs, 't1', 'a', 10)).toEqual(['recalled', 'recalled']);
    expect(nodeHistory(logs, 't1', 'b', 10)).toEqual(['absent', 'missed']);
  });

  it('treats a node not listed as missed in an old log as recalled', () => {
    const logs = [log('2026-09-01', { missedNodeIds: ['b'] })];
    expect(nodeHistory(logs, 't1', 'a', 10)).toEqual(['recalled']);
    expect(nodeHistory(logs, 't1', 'b', 10)).toEqual(['missed']);
  });

  it('keeps only the latest reviews up to the limit', () => {
    const logs = [
      log('2026-09-01', { missedNodeIds: ['a'] }),
      log('2026-09-02'),
      log('2026-09-03', { missedNodeIds: ['a'] }),
    ];
    expect(nodeHistory(logs, 't1', 'a', 2)).toEqual(['recalled', 'missed']);
    expect(nodeHistory([], 't1', 'a', 2)).toEqual([]);
  });
});

describe('reviewResult', () => {
  it('counts recalled nodes when the log knows every graded node', () => {
    expect(
      reviewResult(log('2026-09-01', { nodeIds: ['a', 'b', 'c'], missedNodeIds: ['b'] })),
    ).toEqual({ kind: 'counted', recalled: 2, total: 3 });
    expect(reviewResult(log('2026-09-01', { nodeIds: ['a'] }))).toEqual({
      kind: 'counted',
      recalled: 1,
      total: 1,
    });
  });

  it('reports only the misses for an old log', () => {
    expect(reviewResult(log('2026-09-01'))).toEqual({ kind: 'missedOnly', missed: 0 });
    expect(reviewResult(log('2026-09-01', { missedNodeIds: ['a', 'b'] }))).toEqual({
      kind: 'missedOnly',
      missed: 2,
    });
  });
});
