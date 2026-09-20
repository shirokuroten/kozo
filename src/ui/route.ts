import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'review'; id: string }
  | { name: 'data' }
  | { name: 'due' };

export function parseHash(hash: string): Route {
  const [name, id] = hash.replace(/^#\/?/, '').split('/');
  if (name === 'new') return { name: 'new' };
  if (name === 'data') return { name: 'data' };
  if (name === 'due') return { name: 'due' };
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

// The screen state lives in the URL hash so the phone's back button returns to the previous screen.
// There are only a handful of screens, so no router library is added

type Guard = () => boolean;
let guard: Guard | null = null;
let currentHash = typeof window === 'undefined' ? '#/' : window.location.hash || '#/';
const listeners = new Set<() => void>();

// Registers a function that asks whether it is OK to leave the screen while there are unsaved edits. Returning false cancels the navigation
export function setNavigationGuard(next: Guard | null): void {
  guard = next;
}

function handleHashChange(): void {
  const nextHash = window.location.hash || '#/';
  // The event fired when we restore the original screen below is also discarded here
  if (nextHash === currentHash) return;
  if (guard && !guard()) {
    // The browser's back navigation cannot be blocked, so go back to the original screen after it has moved
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
