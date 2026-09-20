import { parseOutline } from '../domain/outline';
import { pickNewer } from '../domain/portable';
import { createTree } from '../domain/tree';
import type { ReviewLog, Tree } from '../domain/types';
import { openDb, type KozoDb } from './db';
import { SAMPLE_OUTLINE } from './sample';

const SEEDED_KEY = 'seeded';
const GOOGLE_CLIENT_ID_KEY = 'googleClientId';
const LINKED_DOCS_KEY = 'linkedDocs';

// A Google Doc the user linked as a sync source
export interface LinkedDoc {
  docId: string;
  title: string;
  lastSyncedAt: string | null;
}

// The UI touches data only through this layer
export function createRepository(db: KozoDb = openDb()) {
  return {
    listTrees(): Promise<Tree[]> {
      return db.trees.toArray();
    },

    getTree(id: string): Promise<Tree | undefined> {
      return db.trees.get(id);
    },

    async saveTree(tree: Tree): Promise<void> {
      await db.trees.put(tree);
    },

    // Keep the review history. Deleting a tree does not change the fact that it was reviewed that day
    async deleteTree(id: string): Promise<void> {
      await db.trees.delete(id);
    },

    // Use a single transaction so the tree update and the history append can never succeed one without the other
    async saveReview(tree: Tree, log: ReviewLog): Promise<void> {
      await db.transaction('rw', db.trees, db.reviewLogs, async () => {
        await db.trees.put(tree);
        await db.reviewLogs.add(log);
      });
    },

    listReviewLogs(): Promise<ReviewLog[]> {
      return db.reviewLogs.toArray();
    },

    async addTrees(trees: Tree[]): Promise<void> {
      await db.trees.bulkAdd(trees);
    },

    // Applies a sync. Adds, rewrites and deletes happen at once, so stopping midway cannot leave a half-updated shelf.
    // The review history is kept (same reasoning as deleteTree)
    async applySync(put: Tree[], removeIds: string[]): Promise<void> {
      await db.transaction('rw', db.trees, async () => {
        await db.trees.bulkPut(put);
        await db.trees.bulkDelete(removeIds);
      });
    },

    // Settings live only on the device. They are not included in the export file either
    async getGoogleClientId(): Promise<string> {
      return (await db.meta.get(GOOGLE_CLIENT_ID_KEY))?.value ?? '';
    },

    async setGoogleClientId(clientId: string): Promise<void> {
      await db.meta.put({ key: GOOGLE_CLIENT_ID_KEY, value: clientId });
    },

    async listLinkedDocs(): Promise<LinkedDoc[]> {
      const entry = await db.meta.get(LINKED_DOCS_KEY);
      return entry ? (JSON.parse(entry.value) as LinkedDoc[]) : [];
    },

    async saveLinkedDocs(docs: LinkedDoc[]): Promise<void> {
      await db.meta.put({ key: LINKED_DOCS_KEY, value: JSON.stringify(docs) });
    },

    // Never delete existing data. For trees with the same id keep the newer one, and add only the history entries not already on the device
    async importData(trees: Tree[], logs: ReviewLog[]): Promise<{ trees: number }> {
      return db.transaction('rw', db.trees, db.reviewLogs, async () => {
        const accepted = pickNewer(await db.trees.toArray(), trees);
        await db.trees.bulkPut(accepted);
        await db.reviewLogs.bulkPut(logs);
        return { trees: accepted.length };
      });
    },

    // Insert the sample only on first launch. Record that it was inserted, so it does not come back after the user deletes it
    async ensureSample(now: string): Promise<void> {
      await db.transaction('rw', db.trees, db.meta, async () => {
        if (await db.meta.get(SEEDED_KEY)) return;
        await db.meta.put({ key: SEEDED_KEY, value: now });
        if ((await db.trees.count()) > 0) return;
        await db.trees.add(createTree(parseOutline(SAMPLE_OUTLINE)!, now));
      });
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
