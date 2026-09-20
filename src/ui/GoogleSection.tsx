import { useEffect, useState } from 'react';
import { repository, type LinkedDoc } from '../data';
import { syncGoogleDoc } from '../data/gdocSync';
import { loadGoogleSignIn } from '../data/google';
import { parseDocId } from '../domain/gdoc';
import { Button } from './Button';
import { useI18n } from './i18n';
import { Note } from './Note';
import { describePlan } from './syncMessage';

const INPUT_CLASS =
  'w-full rounded border border-rule bg-white px-3 py-2 font-gothic text-base text-sumi placeholder:text-rule';

interface Props {
  onChanged: () => Promise<void>;
  onMessage: (message: string) => void;
}

export function GoogleSection({ onChanged, onMessage }: Props) {
  const { lang, t } = useI18n();
  const [clientId, setClientId] = useState('');
  const [savedClientId, setSavedClientId] = useState('');
  const [docs, setDocs] = useState<LinkedDoc[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const id = await repository.getGoogleClientId();
      setClientId(id);
      setSavedClientId(id);
      setDocs(await repository.listLinkedDocs());
      // If there is no connection, the user is told again at sync time
      if (id) loadGoogleSignIn().catch(() => {});
    })();
  }, []);

  const saveClientId = async () => {
    const id = clientId.trim();
    await repository.setGoogleClientId(id);
    setClientId(id);
    setSavedClientId(id);
    if (id) loadGoogleSignIn().catch(() => {});
    onMessage(id ? t.google.clientIdSaved : t.google.clientIdCleared);
  };

  const sync = async (docIds: string[]) => {
    setBusy(true);
    try {
      const messages: string[] = [];
      for (const docId of docIds) {
        const { doc, plan } = await syncGoogleDoc(
          repository,
          savedClientId,
          docId,
          new Date().toISOString(),
        );
        messages.push(describePlan(t, doc.title, plan));
      }
      await onChanged();
      onMessage(messages.join('\n'));
      return true;
    } catch (error) {
      onMessage(t.sync.failed(error instanceof Error ? error.message : ''));
      return false;
    } finally {
      setDocs(await repository.listLinkedDocs());
      setBusy(false);
    }
  };

  const addDoc = async () => {
    const docId = parseDocId(url);
    if (!docId) {
      onMessage(t.google.badUrl);
      return;
    }
    if (await sync([docId])) setUrl('');
  };

  // Only removes the link. Trees already imported are not deleted
  const unlink = async (docId: string) => {
    const next = docs.filter((d) => d.docId !== docId);
    await repository.saveLinkedDocs(next);
    setDocs(next);
  };

  if (!savedClientId) {
    return (
      <div>
        <Note>{t.google.setupNote}</Note>
        <input
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          placeholder="xxxxxxxx.apps.googleusercontent.com"
          aria-label={t.google.clientIdLabel}
          autoCapitalize="off"
          spellCheck={false}
          className={`mt-2 ${INPUT_CLASS}`}
        />
        <Button className="mt-3" onClick={saveClientId} disabled={clientId.trim() === ''}>
          {t.google.saveClientId}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Note>{t.google.linkedNote}</Note>

      {docs.length > 0 && (
        <ul className="mt-3">
          {docs.map((doc) => (
            <li
              key={doc.docId}
              className="flex items-center justify-between gap-3 border-b border-rule py-2"
            >
              <div className="min-w-0">
                <div className="font-mincho text-base leading-[1.6] text-sumi">{doc.title}</div>
                <div className="font-gothic text-xs text-usuzumi">
                  {doc.lastSyncedAt
                    ? t.google.lastSynced(
                        new Date(doc.lastSyncedAt).toLocaleString(
                          lang === 'ja' ? 'ja-JP' : 'en-US',
                          { dateStyle: 'short', timeStyle: 'short' },
                        ),
                      )
                    : t.google.neverSynced}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button kind="text" onClick={() => unlink(doc.docId)} disabled={busy}>
                  {t.google.unlink}
                </Button>
                <Button onClick={() => sync([doc.docId])} disabled={busy}>
                  {t.sync.one}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {docs.length > 1 && (
        <Button
          kind="solid"
          className="mt-3"
          onClick={() => sync(docs.map((d) => d.docId))}
          disabled={busy}
        >
          {t.sync.all}
        </Button>
      )}

      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://docs.google.com/document/d/..."
        aria-label={t.google.urlLabel}
        autoCapitalize="off"
        spellCheck={false}
        className={`mt-4 ${INPUT_CLASS}`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button kind="solid" onClick={addDoc} disabled={busy || url.trim() === ''}>
          {busy ? t.sync.syncing : t.google.addAndSync}
        </Button>
        <Button
          kind="text"
          onClick={async () => {
            await repository.setGoogleClientId('');
            setSavedClientId('');
          }}
          disabled={busy}
        >
          {t.google.changeClientId}
        </Button>
      </div>
    </div>
  );
}
