import { navigate } from './route';

const STORAGE_KEY = 'kozo:reviewQueue';

// The queue lives in sessionStorage so a reload in the middle of a run continues it, while a new
// tab or a new day starts with none. It is a passing state of this sitting, not data to keep
export function loadQueue(): string[] {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    // Where storage is unavailable or the value is broken, reviews simply run one at a time
  }
  return [];
}

export function saveQueue(ids: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Without the queue the first review still opens, and saving it returns home as usual
  }
}

export function clearQueue(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored in the first place
  }
}

export function startQueue(ids: string[]): void {
  if (ids.length === 0) return;
  // One tree is an ordinary review. Storing it would only add "1 of 1" and a skip button
  if (ids.length === 1) clearQueue();
  else saveQueue(ids);
  navigate({ name: 'review', id: ids[0] });
}
