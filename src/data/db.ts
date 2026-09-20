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

// The name stays as the old app name. Changing it would hide the trees already stored on the device
export function openDb(name = 'kozo'): KozoDb {
  const db = new Dexie(name) as KozoDb;
  // A whole tree is one record. Nodes are not indexed
  db.version(1).stores({
    trees: 'id',
    reviewLogs: 'id, treeId, date',
    meta: 'key',
  });
  return db;
}
