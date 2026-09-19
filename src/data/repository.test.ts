import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseOutline } from '../domain/outline';
import { createTree } from '../domain/tree';
import { openDb } from './db';
import { createRepository, type Repository } from './repository';

const NOW = '2026-09-19T00:00:00.000Z';
let repo: Repository;
let dbCount = 0;

beforeEach(() => {
  repo = createRepository(openDb(`test-${dbCount++}`));
});

describe('repository', () => {
  it('木を保存して読み出せる', async () => {
    const tree = createTree(parseOutline('根\n  枝')!, NOW);
    await repo.saveTree(tree);
    expect(await repo.getTree(tree.id)).toEqual(tree);
    expect(await repo.listTrees()).toEqual([tree]);
  });

  it('同じ id で保存すると置き換える', async () => {
    const tree = createTree(parseOutline('根\n  枝')!, NOW);
    await repo.saveTree(tree);
    await repo.saveTree({ ...tree, root: parseOutline('別の根')! });
    const all = await repo.listTrees();
    expect(all).toHaveLength(1);
    expect(all[0].root.text).toBe('別の根');
  });

  it('木を削除できる', async () => {
    const tree = createTree(parseOutline('根')!, NOW);
    await repo.saveTree(tree);
    await repo.deleteTree(tree.id);
    expect(await repo.listTrees()).toEqual([]);
  });

  it('展開の保存で木の更新と履歴の追記を同時に行う', async () => {
    const tree = createTree(parseOutline('根\n  枝')!, NOW);
    await repo.saveTree(tree);
    const log = { id: 'log1', treeId: tree.id, date: '2026-09-19', ratio: 1, missedNodeIds: [] };
    await repo.saveReview({ ...tree, updatedAt: 'later' }, log);
    expect((await repo.getTree(tree.id))!.updatedAt).toBe('later');
    expect(await repo.listReviewLogs()).toEqual([log]);
  });

  describe('ensureSample', () => {
    it('初回はサンプルの木を1本だけ入れる', async () => {
      await repo.ensureSample(NOW);
      const all = await repo.listTrees();
      expect(all).toHaveLength(1);
      expect(all[0].root.text).toBe('人権の三要素');
      expect(all[0].root.children).toHaveLength(3);
    });

    it('同時に2回呼ばれても1本しか入れない', async () => {
      await Promise.all([repo.ensureSample(NOW), repo.ensureSample(NOW)]);
      expect(await repo.listTrees()).toHaveLength(1);
    });

    it('サンプルを消した後は入れ直さない', async () => {
      await repo.ensureSample(NOW);
      const [sample] = await repo.listTrees();
      await repo.deleteTree(sample.id);
      await repo.ensureSample(NOW);
      expect(await repo.listTrees()).toEqual([]);
    });
  });
});
