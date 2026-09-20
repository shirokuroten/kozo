import type { SyncPlan } from '../domain/gdoc';

export function describePlan(title: string, plan: SyncPlan): string {
  if (plan.created === 0 && plan.updated === 0 && plan.remove.length === 0) {
    return `「${title}」に変わったところはなかった`;
  }
  const parts = [
    plan.created > 0 ? `新しい木 ${plan.created} 本` : '',
    plan.updated > 0 ? `更新 ${plan.updated} 本` : '',
    plan.remove.length > 0 ? `文書から消えたので消した木 ${plan.remove.length} 本` : '',
  ].filter(Boolean);
  return `「${title}」を同期した。${parts.join('、')}`;
}
