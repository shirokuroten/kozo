import { describe, expect, it } from 'vitest';
import { parseLinks, plainText, resolveLink } from './links';
import { parseOutline } from './outline';
import { createTree } from './tree';
import type { Tree } from './types';

const NOW = '2026-09-20T00:00:00.000Z';
const manual = (outline: string): Tree => createTree(parseOutline(outline)!, NOW);
const synced = (outline: string, docId: string): Tree => ({
  ...manual(outline),
  source: { kind: 'gdoc', docId, docTitle: docId, path: [], order: 0 },
});

describe('parseLinks', () => {
  it('returns a single plain segment when there is no link', () => {
    expect(parseLinks('動産であること')).toEqual([{ text: '動産であること' }]);
  });

  it('splits text around [[target]] links', () => {
    expect(parseLinks('詳しくは [[即時取得]] を見る')).toEqual([
      { text: '詳しくは ' },
      { text: '即時取得', target: '即時取得' },
      { text: ' を見る' },
    ]);
  });

  it('handles several links and a link that is the whole text', () => {
    expect(parseLinks('[[要件]]と[[効果]]')).toEqual([
      { text: '要件', target: '要件' },
      { text: 'と' },
      { text: '効果', target: '効果' },
    ]);
    expect(parseLinks('[[要件]]')).toEqual([{ text: '要件', target: '要件' }]);
  });

  it('trims spaces inside the brackets and ignores empty or unclosed brackets', () => {
    expect(parseLinks('[[ 要件 ]]')).toEqual([{ text: '要件', target: '要件' }]);
    expect(parseLinks('[[]] と [[未完')).toEqual([{ text: '[[]] と [[未完' }]);
  });
});

describe('plainText', () => {
  it('drops the brackets so the text reads naturally during a review', () => {
    expect(plainText('詳しくは [[即時取得]] を見る')).toBe('詳しくは 即時取得 を見る');
    expect(plainText('リンクなし')).toBe('リンクなし');
  });
});

describe('resolveLink', () => {
  it('finds the tree whose root text matches the target', () => {
    const from = manual('物権\n  [[即時取得]]');
    const target = manual('即時取得\n  要件');
    expect(resolveLink([from, target], from, '即時取得')).toBe(target);
  });

  it('returns undefined when nothing matches, and never links a tree to itself', () => {
    const from = manual('即時取得\n  [[即時取得]]');
    expect(resolveLink([from], from, '即時取得')).toBeUndefined();
    expect(resolveLink([from], from, 'ない木')).toBeUndefined();
  });

  it('prefers a tree from the same document when several roots share the text', () => {
    const from = synced('物権\n  [[要件]]', '民法');
    const other = synced('要件\n  別の本', '刑法');
    const same = synced('要件\n  同じ本', '民法');
    expect(resolveLink([from, other, same], from, '要件')).toBe(same);
    // A hand-made tree has no document, so the first match wins
    const loose = manual('メモ\n  [[要件]]');
    expect(resolveLink([loose, other, same], loose, '要件')).toBe(other);
  });

  it('ignores differences in full-width and half-width characters and surrounding spaces', () => {
    const from = manual('根\n  [[ＬＲＡ]]');
    const target = manual('LRA\n  枝');
    expect(resolveLink([from, target], from, ' ＬＲＡ ')).toBe(target);
  });
});
