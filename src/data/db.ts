import Dexie, { type EntityTable } from 'dexie';
import type { ReviewLog, Tree } from '../domain/types';

export interface MetaEntry {
  key: string;
  value: string;
}

export type KozoDb = Dexie & {
  trees: EntityTable<Tree, 'id'>;
  reviewLogs: EntityTable<ReviewLog, 'id'>;
  meta: EntityTable<MetaEntry, 'key'>;
};

export function openDb(name = 'kozo'): KozoDb {
  const db = new Dexie(name) as KozoDb;
  // 木は丸ごと1レコード。節を索引にしない
  db.version(1).stores({
    trees: 'id',
    reviewLogs: 'id, treeId, date',
    meta: 'key',
  });
  return db;
}
