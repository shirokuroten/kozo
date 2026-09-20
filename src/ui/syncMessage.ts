import type { SyncPlan } from '../domain/gdoc';
import type { Messages } from './i18n';

export function describePlan(t: Messages, title: string, plan: SyncPlan): string {
  return t.sync.result(title, plan.created, plan.updated, plan.remove.length);
}
