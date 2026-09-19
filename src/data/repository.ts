import { parseOutline } from '../domain/outline';
import { pickNewer } from '../domain/portable';
import { createTree } from '../domain/tree';
import type { ReviewLog, Tree } from '../domain/types';
import { openDb, type KozoDb } from './db';
import { SAMPLE_OUTLINE } from './sample';

const SEEDED_KEY = 'seeded';

// UI はこの層だけを通してデータに触る
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

    // 展開の履歴は残す。木を消しても「その日に展開した」事実は変わらない
    async deleteTree(id: string): Promise<void> {
      await db.trees.delete(id);
    },

    // 木の更新と履歴の追記が片方だけ成功することがないよう、1つのトランザクションで行う
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

    // 既存のデータは消さない。同じ id の木は新しい方を残し、履歴は手元にないものだけ足す
    async importData(trees: Tree[], logs: ReviewLog[]): Promise<{ trees: number }> {
      return db.transaction('rw', db.trees, db.reviewLogs, async () => {
        const accepted = pickNewer(await db.trees.toArray(), trees);
        await db.trees.bulkPut(accepted);
        await db.reviewLogs.bulkPut(logs);
        return { trees: accepted.length };
      });
    },

    // 初回起動のときだけサンプルを入れる。消した後に復活させないため、入れた事実を記録する
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
