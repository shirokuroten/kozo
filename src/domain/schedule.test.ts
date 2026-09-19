import { describe, expect, it } from 'vitest';
import { initialSrs, ratioToQuality, schedule } from './schedule';
import type { Srs } from './types';

const TODAY = '2026-09-19';

describe('ratioToQuality', () => {
  it('DATA.md の表どおりに変換する', () => {
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
  it('未展開の状態を返す', () => {
    expect(initialSrs()).toEqual({ interval: 0, ease: 2.5, reps: 0, due: null, lastRatio: null });
  });
});

describe('schedule', () => {
  it('初回全問正解で interval 1、二回目で 3', () => {
    const first = schedule(initialSrs(), 1, TODAY);
    expect(first.interval).toBe(1);
    expect(first.reps).toBe(1);
    expect(first.due).toBe('2026-09-20');

    const second = schedule(first, 1, '2026-09-20');
    expect(second.interval).toBe(3);
    expect(second.reps).toBe(2);
    expect(second.due).toBe('2026-09-23');
  });

  it('三回目以降は interval に ease を掛ける', () => {
    const srs: Srs = { interval: 3, ease: 2.5, reps: 2, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 1, TODAY);
    expect(next.interval).toBe(8);
    expect(next.ease).toBeCloseTo(2.6);
  });

  it('q < 3 で reps が 0 に戻り、翌日に出る', () => {
    const srs: Srs = { interval: 20, ease: 2.5, reps: 4, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 0.4, TODAY);
    expect(next.reps).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.due).toBe('2026-09-20');
  });

  it('ease が 1.3 を下回らない', () => {
    let srs: Srs = initialSrs();
    for (let i = 0; i < 20; i++) srs = schedule(srs, 0, TODAY);
    expect(srs.ease).toBe(1.3);
  });

  it('ratio 0.5 のとき interval が半分に縮む', () => {
    const srs: Srs = { interval: 8, ease: 2.5, reps: 2, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 0.5, TODAY);
    // 8 * 2.5 = 20 を 0.5 倍
    expect(next.interval).toBe(10);
    expect(next.due).toBe('2026-09-29');
  });

  it('前倒ししても interval は 1 を下回らない', () => {
    const srs: Srs = { interval: 1, ease: 2.5, reps: 1, due: TODAY, lastRatio: 1 };
    const next = schedule(srs, 0.5, TODAY);
    // reps 1 なので 3 日、0.5 倍して round(1.5) = 2
    expect(next.interval).toBe(2);
    expect(schedule(initialSrs(), 0.5, TODAY).interval).toBe(1);
  });

  it('lastRatio を記録する', () => {
    expect(schedule(initialSrs(), 0.75, TODAY).lastRatio).toBe(0.75);
  });

  it('月と年をまたいで期日を計算する', () => {
    const srs: Srs = { interval: 3, ease: 2.5, reps: 2, due: null, lastRatio: 1 };
    expect(schedule(srs, 1, '2026-12-28').due).toBe('2027-01-05');
  });

  it('引数の srs を書き換えない', () => {
    const srs = initialSrs();
    schedule(srs, 1, TODAY);
    expect(srs).toEqual(initialSrs());
  });
});
