import { useEffect, useState } from 'react';
import { repository } from '../data';
import { syncGoogleDoc } from '../data/gdocSync';
import { loadGoogleSignIn } from '../data/google';
import { Button } from './Button';
import { describePlan } from './syncMessage';

// Lets the everyday sync be done with a single press from the list.
// Shown only to users who have already linked a document. Setup is done on the import and backup screen
export function HomeSync({ onChanged }: { onChanged: () => Promise<void> }) {
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
        messages.push(describePlan(result.doc.title, result.plan));
      }
      await onChanged();
      setMessage(messages.join('\n'));
    } catch (error) {
      setMessage(`同期できなかった。${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6">
      <Button onClick={syncAll} disabled={busy}>
        {busy ? '同期中' : 'Google ドキュメントと同期'}
      </Button>
      {message && (
        <p role="status" className="mt-2 font-gothic text-sm whitespace-pre-line text-sumi">
          {message}
        </p>
      )}
    </div>
  );
}
