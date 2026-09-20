import { reviewResult } from '../domain/history';
import type { ReviewLog } from '../domain/types';
import type { Messages } from './i18n';

// The calendar and the tree view word a past review the same way
export function describeResult(t: Messages, log: ReviewLog): string {
  const result = reviewResult(log);
  if (result.kind === 'counted') return t.history.recalledOf(result.recalled, result.total);
  return result.missed === 0 ? t.history.allRecalled : t.history.missedNodes(result.missed);
}
