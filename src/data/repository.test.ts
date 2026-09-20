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
  it('saves and reads back a tree', async () => {
    const tree = createTree(parseOutline('根\n  枝')!, NOW);
    await repo.saveTree(tree);
    expect(await repo.getTree(tree.id)).toEqual(tree);
    expect(await repo.listTrees()).toEqual([tree]);
  });

  it('replaces a tree when saved with the same id', async () => {
    const tree = createTree(parseOutline('根\n  枝')!, NOW);
    await repo.saveTree(tree);
    await repo.saveTree({ ...tree, root: parseOutline('別の根')! });
    const all = await repo.listTrees();
    expect(all).toHaveLength(1);
    expect(all[0].root.text).toBe('別の根');
  });

  it('deletes a tree', async () => {
    const tree = createTree(parseOutline('根')!, NOW);
    await repo.saveTree(tree);
    await repo.deleteTree(tree.id);
    expect(await repo.listTrees()).toEqual([]);
  });

  it('updates the tree and appends the history together when saving a review', async () => {
    const tree = createTree(parseOutline('根\n  枝')!, NOW);
    await repo.saveTree(tree);
    const log = {
      id: 'log1',
      treeId: tree.id,
      date: '2026-09-19',
      ratio: 1,
      missedNodeIds: [],
      nodeIds: [tree.root.children[0].id],
    };
    await repo.saveReview({ ...tree, updatedAt: 'later' }, log);
    expect((await repo.getTree(tree.id))!.updatedAt).toBe('later');
    expect(await repo.listReviewLogs()).toEqual([log]);
  });

  it('imports without deleting existing trees, keeping the newer one for the same id', async () => {
    const mine = createTree(parseOutline('手元の木')!, NOW);
    const shared = createTree(parseOutline('共有の木')!, NOW);
    await repo.addTrees([mine, shared]);

    const older = {
      ...shared,
      root: parseOutline('古い版')!,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const added = createTree(parseOutline('新しく来た木')!, NOW);
    const log = { id: 'log1', treeId: added.id, date: '2026-09-19', ratio: 1, missedNodeIds: [] };

    expect(await repo.importData([older, added], [log])).toEqual({ trees: 1 });
    // Importing the same history again does not add duplicates
    await repo.importData([], [log]);

    const texts = (await repo.listTrees()).map((t) => t.root.text).sort();
    expect(texts).toEqual(['共有の木', '手元の木', '新しく来た木'].sort());
    expect(await repo.listReviewLogs()).toHaveLength(1);
  });

  it('writes and deletes at once when applying a sync', async () => {
    const stay = createTree(parseOutline('残る木')!, NOW);
    const gone = createTree(parseOutline('消える木')!, NOW);
    await repo.addTrees([stay, gone]);
    const added = createTree(parseOutline('増える木')!, NOW);
    await repo.applySync([added, { ...stay, updatedAt: 'later' }], [gone.id]);
    const all = await repo.listTrees();
    expect(all.map((t) => t.root.text).sort()).toEqual(['増える木', '残る木'].sort());
    expect(all.find((t) => t.id === stay.id)!.updatedAt).toBe('later');
  });

  it('remembers the Google settings and the linked documents', async () => {
    expect(await repo.getGoogleClientId()).toBe('');
    expect(await repo.listLinkedDocs()).toEqual([]);
    await repo.setGoogleClientId('abc.apps.googleusercontent.com');
    const docs = [{ docId: 'd1', title: '憲法', lastSyncedAt: null }];
    await repo.saveLinkedDocs(docs);
    expect(await repo.getGoogleClientId()).toBe('abc.apps.googleusercontent.com');
    expect(await repo.listLinkedDocs()).toEqual(docs);
  });

  describe('ensureSample', () => {
    it('inserts exactly one sample tree on first launch', async () => {
      await repo.ensureSample(NOW);
      const all = await repo.listTrees();
      expect(all).toHaveLength(1);
      expect(all[0].root.text).toBe('人権の三要素');
      expect(all[0].root.children).toHaveLength(3);
    });

    it('inserts only one tree even when called twice at the same time', async () => {
      await Promise.all([repo.ensureSample(NOW), repo.ensureSample(NOW)]);
      expect(await repo.listTrees()).toHaveLength(1);
    });

    it('does not reinsert the sample after it was deleted', async () => {
      await repo.ensureSample(NOW);
      const [sample] = await repo.listTrees();
      await repo.deleteTree(sample.id);
      await repo.ensureSample(NOW);
      expect(await repo.listTrees()).toEqual([]);
    });
  });
});
