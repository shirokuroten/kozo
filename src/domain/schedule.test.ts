import { describe, expect, it } from 'vitest';
import { initialSrs, ratioToQuality, schedule } from './schedule';
import type { Srs } from './types';

const TODAY = '2026-09-19';

describe('ratioToQuality', () => {
  it('converts according to the table in DATA.md', () => {
    expect(ratioToQuality(1)).toBe(5);
    expect(ratioToQuality(0.99)).toBe(4);
    expect(ratioToQuality(0.8)).toBe(4);
    expect(ratioToQuality(0.79)).toBe(3);
    expect(ratioToQuality(0.5)).toBe(3);
    expect(ratioToQuality(0.49)).toBe(1);
    expect(ratioToQuality(0)).toBe(1);
  });
});

describe('initialSrs', () => {
  it('returns the never-reviewed state', () => {
    expect(initialSrs()).toEqual({ interval: 0, ease: 2.5, reps: 0, due: null, lastRatio: null });
  });
});

describe('schedule', () => {
  it('gives interval 1 for a perfect first review, then 3 for the second', () => {
    const first = schedule(initialSrs(), 1, TODAY);
    expect(first.interval).toBe(1);
    expect(first.reps).toBe(1);
    expect(first.due).toBe('2026-09-20');

    const second = schedule(first, 1, '2026-09-20');
    expect(second.interval).toBe(3);
    expect(second.reps).toBe(2);
    expect(second.due).toBe('2026-09-23');
  });

  it('multiplies interval by ease from the third review on', () => {
    const srs: Srs = { interval: 3, ease: 2.5, reps: 2, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 1, TODAY);
    expect(next.interval).toBe(8);
    expect(next.ease).toBeCloseTo(2.6);
  });

  it('resets reps to 0 and comes due the next day when q < 3', () => {
    const srs: Srs = { interval: 20, ease: 2.5, reps: 4, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 0.4, TODAY);
    expect(next.reps).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.due).toBe('2026-09-20');
  });

  it('never lets ease fall below 1.3', () => {
    let srs: Srs = initialSrs();
    for (let i = 0; i < 20; i++) srs = schedule(srs, 0, TODAY);
    expect(srs.ease).toBe(1.3);
  });

  it('halves interval when ratio is 0.5', () => {
    const srs: Srs = { interval: 8, ease: 2.5, reps: 2, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 0.5, TODAY);
    // 8 * 2.5 = 20, times 0.5
    expect(next.interval).toBe(10);
    expect(next.due).toBe('2026-09-29');
  });

  it('never lets interval fall below 1 even when the due date is pulled forward', () => {
    const srs: Srs = { interval: 1, ease: 2.5, reps: 1, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 0.5, TODAY);
    // reps is 1 so 3 days, times 0.5 gives round(1.5) = 2
    expect(next.interval).toBe(2);
    expect(schedule(initialSrs(), 0.5, TODAY).interval).toBe(1);
  });

  it('records lastRatio', () => {
    expect(schedule(initialSrs(), 0.75, TODAY).lastRatio).toBe(0.75);
  });

  it('computes due dates across month and year boundaries', () => {
    const srs: Srs = { interval: 3, ease: 2.5, reps: 2, due: null, lastRatio: 1 };
    expect(schedule(srs, 1, '2026-12-28').due).toBe('2027-01-05');
  });

  it('does not mutate the srs passed in', () => {
    const srs = initialSrs();
    schedule(srs, 1, TODAY);
    expect(srs).toEqual(initialSrs());
  });
});
