import type { NodeId, ReviewLog } from './types';

// Dates here are plain 'YYYY-MM-DD' strings in the user's calendar, exactly as the logs store
// them. All arithmetic goes through Date.UTC so the device's time zone can never shift a day

export interface YearMonth {
  year: number;
  // 1 to 12
  month: number;
}

export interface DayCell {
  // null for the padding cells before the 1st and after the last day
  date: string | null;
  count: number;
  // Whether any review that day missed a node
  missed: boolean;
}

export type NodeMark = 'recalled' | 'missed' | 'absent';

// Logs written before nodeIds existed cannot tell how many nodes the tree had at that review,
// so they can only report the misses
export type ReviewResult =
  { kind: 'counted'; recalled: number; total: number } | { kind: 'missedOnly'; missed: number };

export function monthOf(date: string): YearMonth {
  const [year, month] = date.split('-').map(Number);
  return { year, month };
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const moved = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: moved.getUTCFullYear(), month: moved.getUTCMonth() + 1 };
}

// Negative when a is earlier than b, zero for the same month
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

// The calendar never shows the future: nothing can have been reviewed there
export function canGoNext(shown: YearMonth, today: string): boolean {
  return compareMonths(shown, monthOf(today)) < 0;
}

// Paging back stops at the month of the oldest review, so the user cannot wander into years of
// empty grids
export function canGoPrev(shown: YearMonth, logs: ReviewLog[]): boolean {
  return logs.some((log) => compareMonths(monthOf(log.date), shown) < 0);
}

function toDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Oldest first. Within a day the save time decides. A log without one predates the field, so it
// is older than any log of that day that has it
function byTime(a: ReviewLog, b: ReviewLog): number {
  return a.date.localeCompare(b.date) || (a.at ?? '').localeCompare(b.at ?? '');
}

export function logsOn(logs: ReviewLog[], date: string): ReviewLog[] {
  return logs.filter((log) => log.date === date).sort(byTime);
}

export function logsInMonth(logs: ReviewLog[], { year, month }: YearMonth): ReviewLog[] {
  const prefix = toDate(year, month, 1).slice(0, 8);
  return logs.filter((log) => log.date.startsWith(prefix));
}

// Weeks start on Sunday. Every week has seven cells, padded with null dates
export function buildMonth(logs: ReviewLog[], year: number, month: number): DayCell[][] {
  const byDate = new Map<string, { count: number; missed: boolean }>();
  for (const log of logsInMonth(logs, { year, month })) {
    const day = byDate.get(log.date) ?? { count: 0, missed: false };
    byDate.set(log.date, { count: day.count + 1, missed: day.missed || log.ratio < 1 });
  }

  const padding: DayCell = { date: null, count: 0, missed: false };
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  // Day 0 of the next month is the last day of this one
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: DayCell[] = Array.from({ length: firstWeekday }, () => padding);
  for (let day = 1; day <= dayCount; day += 1) {
    const date = toDate(year, month, day);
    cells.push({ date, ...(byDate.get(date) ?? { count: 0, missed: false }) });
  }
  while (cells.length % 7 !== 0) cells.push(padding);

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function treeLogs(logs: ReviewLog[], treeId: string): ReviewLog[] {
  return logs.filter((log) => log.treeId === treeId).sort(byTime);
}

// One mark per review for the last `limit` reviews of the tree, oldest first. Every node of a
// tree gets the same number of marks, so the rows line up as columns
export function nodeHistory(
  logs: ReviewLog[],
  treeId: string,
  nodeId: NodeId,
  limit: number,
): NodeMark[] {
  return treeLogs(logs, treeId)
    .slice(-limit)
    .map((log) => {
      if (log.missedNodeIds.includes(nodeId)) return 'missed';
      // Without nodeIds there is no way to know whether the node existed, so it counts as recalled
      if (log.nodeIds && !log.nodeIds.includes(nodeId)) return 'absent';
      return 'recalled';
    });
}

export function reviewResult(log: ReviewLog): ReviewResult {
  const missed = log.missedNodeIds.length;
  if (!log.nodeIds) return { kind: 'missedOnly', missed };
  return { kind: 'counted', recalled: log.nodeIds.length - missed, total: log.nodeIds.length };
}
