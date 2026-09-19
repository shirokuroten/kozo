import { docToOutlines, planSync, type SyncPlan } from '../domain/gdoc';
import { fetchGoogleDoc, getAccessToken } from './google';
import type { LinkedDoc, Repository } from './repository';

export interface SyncResult {
  doc: LinkedDoc;
  plan: SyncPlan;
}

// 文書を1つ読み、木に反映する。文書からアプリへの一方向で、文書には何も書き込まない
export async function syncGoogleDoc(
  repo: Repository,
  clientId: string,
  docId: string,
  now: string,
): Promise<SyncResult> {
  const token = await getAccessToken(clientId);
  const googleDoc = await fetchGoogleDoc(docId, token);
  const plan = planSync(await repo.listTrees(), docId, docToOutlines(googleDoc), now);
  await repo.putTrees(plan.put);

  const doc: LinkedDoc = { docId, title: googleDoc.title ?? '無題の文書', lastSyncedAt: now };
  const docs = await repo.listLinkedDocs();
  await repo.saveLinkedDocs(
    docs.some((d) => d.docId === docId)
      ? docs.map((d) => (d.docId === docId ? doc : d))
      : [...docs, doc],
  );
  return { doc, plan };
}
