import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'review'; id: string }
  | { name: 'data' };

export function parseHash(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, '').split('/');
  if (name === 'new') return { name: 'new' };
  if (name === 'data') return { name: 'data' };
  if ((name === 'view' || name === 'edit' || name === 'review') && id) {
    return { name, id: decodeURIComponent(id) };
  }
  return { name: 'home' };
}

export function toHash(route: Route): string {
  if (route.name === 'home') return '#/';
  if ('id' in route) return `#/${route.name}/${encodeURIComponent(route.id)}`;
  return `#/${route.name}`;
}

// スマホの「戻る」で前の画面に戻れるよう、画面の状態を URL のハッシュに置く。
// 画面は6つだけなので、ルーターのライブラリは入れない

type Guard = () => boolean;
let guard: Guard | null = null;
let currentHash = typeof window === 'undefined' ? '#/' : window.location.hash || '#/';
const listeners = new Set<() => void>();

// 未保存の編集があるとき、画面を離れてよいかを尋ねる関数を登録する。false を返すと移動を取り消す
export function setNavigationGuard(next: Guard | null): void {
  guard = next;
}

function handleHashChange(): void {
  const nextHash = window.location.hash || '#/';
  // 下で元の画面に戻したときの通知もここで捨てる
  if (nextHash === currentHash) return;
  if (guard && !guard()) {
    // ブラウザの「戻る」は止められないので、移動した後で元の画面に戻す
    window.location.hash = currentHash;
    return;
  }
  currentHash = nextHash;
  window.scrollTo(0, 0);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('hashchange', handleHashChange);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('hashchange', handleHashChange);
  };
}

export function navigate(route: Route): void {
  window.location.hash = toHash(route);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => currentHash);
  return parseHash(hash);
}
