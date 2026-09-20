import { useEffect, useState } from 'react';
import { repository } from '../data';
import { syncGoogleDoc } from '../data/gdocSync';
import { loadGoogleSignIn } from '../data/google';
import { Button } from './Button';
import { useI18n } from './i18n';
import { describePlan } from './syncMessage';

// Lets the everyday sync be done with a single press from the list.
// Shown only to users who have already linked a document. Setup is done on the import and backup screen
export function HomeSync({ onChanged }: { onChanged: () => Promise<void> }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const [clientId, docs] = await Promise.all([
        repository.getGoogleClientId(),
        repository.listLinkedDocs(),
      ]);
      if (!clientId || docs.length === 0) return;
      setReady(true);
      // Some browsers only allow the sign-in popup right after a press, so load the script ahead of time
      loadGoogleSignIn().catch(() => {});
    })();
  }, []);

  if (!ready) return null;

  const syncAll = async () => {
    setBusy(true);
    try {
      const clientId = await repository.getGoogleClientId();
      const messages: string[] = [];
      for (const doc of await repository.listLinkedDocs()) {
        const result = await syncGoogleDoc(
          repository,
          clientId,
          doc.docId,
          new Date().toISOString(),
        );
        messages.push(describePlan(t, result.doc.title, result.plan));
      }
      await onChanged();
      setMessage(messages.join('\n'));
    } catch (error) {
      setMessage(t.sync.failed(error instanceof Error ? error.message : ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6">
      <Button onClick={syncAll} disabled={busy}>
        {busy ? t.sync.syncing : t.sync.withGoogle}
      </Button>
      {message && (
        <p role="status" className="mt-2 font-gothic text-sm whitespace-pre-line text-sumi">
          {message}
        </p>
      )}
    </div>
  );
}
