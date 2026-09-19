import type { Srs } from './types';

const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;

export function initialSrs(): Srs {
  return { interval: 0, ease: INITIAL_EASE, reps: 0, due: null, lastRatio: null };
}

export function ratioToQuality(ratio: number): number {
  if (ratio >= 1) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.5) return 3;
  return 1;
}

// 端末のタイムゾーンや夏時間で日付がずれないよう、UTC の暦日として足す
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function schedule(srs: Srs, ratio: number, today: string): Srs {
  const q = ratioToQuality(ratio);

  let reps: number;
  let interval: number;
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    interval = srs.reps === 0 ? 1 : srs.reps === 1 ? 3 : Math.round(srs.interval * srs.ease);
    reps = srs.reps + 1;
  }

  const ease = Math.max(MIN_EASE, srs.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  // 落ちた節がある木は前倒しする。弱点は出題の中身ではなく間隔で効かせる
  if (ratio < 1 && interval > 1) {
    interval = Math.max(1, Math.round(interval * ratio));
  }

  return { interval, ease, reps, due: addDays(today, interval), lastRatio: ratio };
}
