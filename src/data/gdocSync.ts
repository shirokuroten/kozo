import { docToTrees, planSync, type SyncPlan } from '../domain/gdoc';
import { fetchGoogleDoc, getAccessToken } from './google';
import type { LinkedDoc, Repository } from './repository';

export interface SyncResult {
  doc: LinkedDoc;
  plan: SyncPlan;
}

// Reads one document and applies it to the trees. It is one-way, from the document to the app, and nothing is written to the document
export async function syncGoogleDoc(
  repo: Repository,
  clientId: string,
  docId: string,
  now: string,
): Promise<SyncResult> {
  const token = await getAccessToken(clientId);
  const googleDoc = await fetchGoogleDoc(docId, token);
  const title = googleDoc.title ?? 'Untitled document';
  const plan = planSync(await repo.listTrees(), docId, docToTrees(googleDoc), now, title);
  await repo.applySync(
    plan.put,
    plan.remove.map((tree) => tree.id),
  );

  const doc: LinkedDoc = { docId, title, lastSyncedAt: now };
  const docs = await repo.listLinkedDocs();
  await repo.saveLinkedDocs(
    docs.some((d) => d.docId === docId)
      ? docs.map((d) => (d.docId === docId ? doc : d))
      : [...docs, doc],
  );
  return { doc, plan };
}
