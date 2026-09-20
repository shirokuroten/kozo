import { describe, expect, it } from 'vitest';
import type { SyncPlan } from '../domain/gdoc';
import { createNode } from '../domain/outline';
import { createTree } from '../domain/tree';
import { describeResult } from './historyText';
import { detectLang, en, ja, type Messages } from './i18n';
import { describePlan } from './syncMessage';

// Every parameter is a count, a text or a flag, and each of those accepts a number or a string
// when interpolated, so a few generic argument rows exercise all signatures: zero, singular,
// plural, an empty text and a real text
const SAMPLES: unknown[][] = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [3, 3, 3, 3],
  ['', 0, 0, 0],
  ['Title', 3, 1, 0],
];

function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === 'string') {
    out.push([path, value]);
  } else if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => string;
    SAMPLES.forEach((args, i) => out.push([`${path}#${i}`, fn(...args)]));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) collect(child, `${path}.${key}`, out);
  }
}

function allTexts(messages: Messages, name: string): [string, string][] {
  const out: [string, string][] = [];
  collect(messages, name, out);
  return out;
}

const texts = [...allTexts(ja, 'ja'), ...allTexts(en, 'en')];

describe('messages', () => {
  it('has no empty text in either language', () => {
    expect(texts.length).toBeGreaterThan(100);
    for (const [path, text] of texts) expect(text, path).not.toBe('');
  });

  it('never uses an em dash, an en dash or an exclamation mark', () => {
    for (const [path, text] of texts) expect(text, path).not.toMatch(/[\u2014\u2013!\uFF01]/);
  });

  it('keeps Japanese out of the English messages', () => {
    for (const [path, text] of allTexts(en, 'en')) {
      expect(text, path).not.toMatch(/[\u3000-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/);
    }
  });
});

describe('fixed wording', () => {
  it('matches the design document in Japanese', () => {
    expect(ja.review.expand(1)).toBe('枝が 1 本。思い出してから開く');
    expect(ja.review.expand(3)).toBe('枝が 3 本。思い出してから開く');
    expect(ja.review.allRecalled(3)).toBe('3 / 3 が言えた。木が丸ごと再現できている');
    expect(ja.review.someMissed(1, 3)).toBe(
      '1 / 3 が言えた。落ちた節は次回、木の上で朱色で表示される',
    );
    expect(ja.row.neverReviewed).toBe('まだ一度も展開していない');
    expect(ja.home.noTrees).toBe('まだ木がない。最初の1本を作る');
    expect(ja.edit.hint).toBe('1行目が見出し。行頭の空白2つ（または全角空白）で1段深くなる');
    expect(ja.home.dueCount(1)).toBe('出番の木 1 本');
    expect(ja.home.dueCount(3)).toBe('出番の木 3 本');
    expect(ja.queue.reviewGroup(1)).toBe('この 1 本を展開');
    expect(ja.queue.reviewGroup(3)).toBe('この 3 本を続けて展開');
    expect(ja.queue.reviewDue(3)).toBe('出番の 3 本を続けて展開');
    expect(ja.queue.position(2, 3)).toBe('3 本中 2 本目');
    expect(ja.history.title).toBe('展開の記録');
    expect(ja.history.weekdays.join('')).toBe('日月火水木金土');
    expect(ja.history.monthLabel(2026, 9)).toBe('2026年9月');
    expect(ja.history.monthSummary(3)).toBe('この月は 3 回展開');
    expect(ja.history.deletedTree).toBe('消した木');
    expect(ja.history.recalledOf(2, 3)).toBe('2 / 3 が言えた');
    expect(ja.history.allRecalled).toBe('すべて言えた');
    expect(ja.history.missedNodes(2)).toBe('2 節で落ちた');
    expect(ja.history.pastReviews).toBe('これまでの展開');
    expect(ja.history.marksLabel(2, 10)).toBe('直近 10 回のうち 2 回落ちた');
  });

  it('matches the agreed wording in English, with singular and plural', () => {
    expect(en.review.expand(1)).toBe('1 branch. Recall it, then open');
    expect(en.review.expand(3)).toBe('3 branches. Recall them, then open');
    expect(en.review.allRecalled(3)).toBe('Recalled 3 / 3. The whole tree is intact');
    expect(en.review.someMissed(1, 3)).toBe(
      'Recalled 1 / 3. Missed nodes will show in vermilion on the tree next time',
    );
    expect(en.row.neverReviewed).toBe('Not reviewed yet');
    expect(en.home.noTrees).toBe('No trees yet. Make the first one');
    expect(en.edit.hint).toBe(
      'First line is the heading. Indent two spaces (or a tab) to go one level deeper',
    );
    expect(en.home.dueCount(1)).toBe('1 tree due');
    expect(en.home.dueCount(3)).toBe('3 trees due');
    expect(en.common.nodeCount(1)).toBe('1 node');
    expect(en.common.nodeCount(3)).toBe('3 nodes');
    expect(en.queue.reviewGroup(1)).toBe('Review this tree');
    expect(en.queue.reviewGroup(3)).toBe('Review these 3 trees in a row');
    expect(en.queue.reviewDue(3)).toBe('Review all 3 due trees in a row');
    expect(en.queue.position(2, 3)).toBe('Tree 2 of 3');
    expect(en.history.title).toBe('Review history');
    expect(en.history.weekdays.join(' ')).toBe('S M T W T F S');
    expect(en.history.monthLabel(2026, 9)).toBe('September 2026');
    expect(en.history.monthLabel(2027, 1)).toBe('January 2027');
    expect(en.history.monthLabel(2026, 12)).toBe('December 2026');
    expect(en.history.monthSummary(1)).toBe('1 review this month');
    expect(en.history.monthSummary(3)).toBe('3 reviews this month');
    expect(en.history.dayReviews('Sep 20', 1)).toBe('Sep 20, 1 review');
    expect(en.history.dayReviews('Sep 20', 3)).toBe('Sep 20, 3 reviews');
    expect(en.history.deletedTree).toBe('Deleted tree');
    expect(en.history.recalledOf(2, 3)).toBe('Recalled 2 / 3');
    expect(en.history.allRecalled).toBe('All recalled');
    expect(en.history.missedNodes(1)).toBe('Missed 1 node');
    expect(en.history.missedNodes(2)).toBe('Missed 2 nodes');
    expect(en.history.pastReviews).toBe('Past reviews');
    expect(en.history.marksLabel(2, 10)).toBe('Missed 2 of the last 10 reviews');
    expect(en.history.marksLabel(0, 1)).toBe('Missed 0 of the last 1 review');
  });
});

describe('describeResult', () => {
  const base = { id: 'l', treeId: 't', date: '2026-09-20', ratio: 1, missedNodeIds: [] };

  it('counts recalled nodes when the log lists every graded node', () => {
    const log = { ...base, ratio: 2 / 3, missedNodeIds: ['b'], nodeIds: ['a', 'b', 'c'] };
    expect(describeResult(ja, log)).toBe('2 / 3 が言えた');
    expect(describeResult(en, log)).toBe('Recalled 2 / 3');
  });

  it('falls back to the misses alone for a log without nodeIds', () => {
    expect(describeResult(ja, base)).toBe('すべて言えた');
    expect(describeResult(en, base)).toBe('All recalled');
    const missed = { ...base, ratio: 0.5, missedNodeIds: ['a'] };
    expect(describeResult(ja, missed)).toBe('1 節で落ちた');
    expect(describeResult(en, missed)).toBe('Missed 1 node');
  });
});

describe('describePlan', () => {
  const NOW = '2026-09-20T00:00:00.000Z';
  const plan = (created: number, updated: number, removed: number): SyncPlan => ({
    put: [],
    remove: Array.from({ length: removed }, () => createTree(createNode('x'), NOW)),
    created,
    updated,
    unchanged: 0,
  });

  it('lists only what changed', () => {
    expect(describePlan(ja, '民法', plan(2, 0, 1))).toBe(
      '「民法」を同期した。新しい木 2 本、文書から消えたので消した木 1 本',
    );
    expect(describePlan(en, 'Contracts', plan(2, 1, 3))).toBe(
      'Synced "Contracts". 2 new, 1 updated, 3 removed because they are gone from the document',
    );
  });

  it('says so when nothing changed', () => {
    expect(describePlan(ja, '民法', plan(0, 0, 0))).toBe('「民法」に変わったところはなかった');
    expect(describePlan(en, 'Contracts', plan(0, 0, 0))).toBe('Nothing changed in "Contracts"');
  });
});

describe('detectLang', () => {
  it('prefers a saved choice, then the browser language, and falls back to English', () => {
    expect(detectLang('ja', 'en-US')).toBe('ja');
    expect(detectLang('en', 'ja-JP')).toBe('en');
    expect(detectLang(null, 'ja-JP')).toBe('ja');
    expect(detectLang(null, 'fr-FR')).toBe('en');
    expect(detectLang('de', 'ja')).toBe('ja');
  });
});
