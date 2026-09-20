import { describe, expect, it } from 'vitest';
import { parseHash, toHash, type Route } from './route';

describe('parseHash', () => {
  it('空や未知のハッシュは一覧に倒す', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/unknown')).toEqual({ name: 'home' });
    expect(parseHash('#/view')).toEqual({ name: 'home' });
  });

  it('toHash と往復できる', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'new' },
      { name: 'data' },
      { name: 'due' },
      { name: 'view', id: 'abc-123' },
      { name: 'edit', id: 'abc-123' },
      { name: 'review', id: 'a/b c' },
    ];
    for (const route of routes) expect(parseHash(toHash(route))).toEqual(route);
  });
});
