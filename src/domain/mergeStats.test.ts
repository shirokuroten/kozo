import { describe, expect, it } from 'vitest';
import { mergeStats } from './mergeStats';
import { parseOutline } from './outline';
import type { Node } from './types';

function find(root: Node, ...path: string[]): Node {
  let node = root;
  for (const text of path) {
    const child = node.children.find((c) => c.text === text);
    if (!child) throw new Error(`節が見つからない: ${text}`);
    node = child;
  }
  return node;
}

function oldTree(): Node {
  const root = parseOutline('三要素\n  固有性\n    生来の権利\n  不可侵性\n    侵されない')!;
  find(root, '固有性').missCount = 2;
  find(root, '固有性').lastResult = false;
  find(root, '固有性', '生来の権利').missCount = 1;
  find(root, '固有性', '生来の権利').lastResult = true;
  find(root, '不可侵性').lastResult = true;
  return root;
}

describe('mergeStats', () => {
  it('パス上の文言が一致する節は id と統計を引き継ぐ', () => {
    const old = oldTree();
    const next = parseOutline('三要素\n  固有性\n    生来の権利\n  不可侵性\n    侵されない')!;
    const merged = mergeStats(old, next);

    expect(merged.id).toBe(old.id);
    const a = find(merged, '固有性');
    expect(a.id).toBe(find(old, '固有性').id);
    expect(a.missCount).toBe(2);
    expect(a.lastResult).toBe(false);
    const leaf = find(merged, '固有性', '生来の権利');
    expect(leaf.id).toBe(find(old, '固有性', '生来の権利').id);
    expect(leaf.missCount).toBe(1);
    expect(leaf.lastResult).toBe(true);
  });

  it('文言が変わった節は新しい節として扱う', () => {
    const old = oldTree();
    const next = parseOutline('三要素\n  固有性\n    生まれながらの権利\n  不可侵性')!;
    const merged = mergeStats(old, next);
    const leaf = find(merged, '固有性', '生まれながらの権利');
    expect(leaf.missCount).toBe(0);
    expect(leaf.lastResult).toBeNull();
    expect(leaf.id).toBe(find(next, '固有性', '生まれながらの権利').id);
  });

  it('親の文言が変わると、その下の節も新しい節になる', () => {
    const old = oldTree();
    const next = parseOutline('三要素\n  固有の性質\n    生来の権利')!;
    const merged = mergeStats(old, next);
    expect(find(merged, '固有の性質', '生来の権利').missCount).toBe(0);
  });

  it('同じ文言でも別の親の下に移れば引き継がない', () => {
    const old = oldTree();
    const next = parseOutline('三要素\n  固有性\n  不可侵性\n    生来の権利')!;
    const merged = mergeStats(old, next);
    expect(find(merged, '不可侵性', '生来の権利').missCount).toBe(0);
  });

  it('兄弟の順番が入れ替わっても引き継ぐ', () => {
    const old = oldTree();
    const next = parseOutline('三要素\n  不可侵性\n  固有性')!;
    const merged = mergeStats(old, next);
    expect(find(merged, '固有性').missCount).toBe(2);
    expect(merged.children.map((c) => c.text)).toEqual(['不可侵性', '固有性']);
  });

  it('同じ文言の兄弟は上から順に1対1で対応づける', () => {
    const old = parseOutline('根\n  同じ\n  同じ')!;
    old.children[0].missCount = 1;
    old.children[1].missCount = 5;
    const next = parseOutline('根\n  同じ\n  同じ\n  同じ')!;
    const merged = mergeStats(old, next);
    expect(merged.children.map((c) => c.missCount)).toEqual([1, 5, 0]);
    expect(new Set(merged.children.map((c) => c.id)).size).toBe(3);
  });

  it('根の文言が変わったら何も引き継がない', () => {
    const old = oldTree();
    const next = parseOutline('人権の三要素\n  固有性')!;
    const merged = mergeStats(old, next);
    expect(merged.id).toBe(next.id);
    expect(find(merged, '固有性').missCount).toBe(0);
  });

  it('引数の木を書き換えない', () => {
    const old = oldTree();
    const next = parseOutline('三要素\n  固有性')!;
    const nextId = find(next, '固有性').id;
    mergeStats(old, next);
    expect(find(next, '固有性').id).toBe(nextId);
    expect(find(next, '固有性').missCount).toBe(0);
  });
});
