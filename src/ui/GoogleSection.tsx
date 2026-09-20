import { useEffect, useState } from 'react';
import { repository, type LinkedDoc } from '../data';
import { syncGoogleDoc } from '../data/gdocSync';
import { loadGoogleSignIn } from '../data/google';
import { parseDocId } from '../domain/gdoc';
import { Button } from './Button';
import { Note } from './Note';
import { describePlan } from './syncMessage';

const INPUT_CLASS =
  'w-full rounded border border-rule bg-white px-3 py-2 font-gothic text-base text-sumi placeholder:text-rule';

interface Props {
  onChanged: () => Promise<void>;
  onMessage: (message: string) => void;
}

export function GoogleSection({ onChanged, onMessage }: Props) {
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
      // 通信できないときは同期のときに改めて知らせる
      if (id) loadGoogleSignIn().catch(() => {});
    })();
  }, []);

  const saveClientId = async () => {
    const id = clientId.trim();
    await repository.setGoogleClientId(id);
    setClientId(id);
    setSavedClientId(id);
    if (id) loadGoogleSignIn().catch(() => {});
    onMessage(id ? 'クライアント ID を保存した' : 'クライアント ID を消した');
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
        messages.push(describePlan(doc.title, plan));
      }
      await onChanged();
      onMessage(messages.join('\n'));
      return true;
    } catch (error) {
      onMessage(`同期できなかった。${error instanceof Error ? error.message : ''}`);
      return false;
    } finally {
      setDocs(await repository.listLinkedDocs());
      setBusy(false);
    }
  };

  const addDoc = async () => {
    const docId = parseDocId(url);
    if (!docId) {
      onMessage('Google ドキュメントの URL として読めない');
      return;
    }
    if (await sync([docId])) setUrl('');
  };

  // 登録を外すだけ。すでに取り込んだ木は消さない
  const unlink = async (docId: string) => {
    const next = docs.filter((d) => d.docId !== docId);
    await repository.saveLinkedDocs(next);
    setDocs(next);
  };

  if (!savedClientId) {
    return (
      <div>
        <Note>
          Google
          ドキュメントに書いた木を、ボタン1つで取り込めるようにする。最初に1度だけ、自分用のクライアント
          ID をここに貼る（作り方は docs/GOOGLE.md）。ID はこの端末の中だけに保存する
        </Note>
        <input
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          placeholder="xxxxxxxx.apps.googleusercontent.com"
          aria-label="Google のクライアント ID"
          autoCapitalize="off"
          spellCheck={false}
          className={`mt-2 ${INPUT_CLASS}`}
        />
        <Button className="mt-3" onClick={saveClientId} disabled={clientId.trim() === ''}>
          クライアント ID を保存
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Note>
        Google ドキュメントに「見出しの行 +
        その下の箇条書き」で書いておくと、見出しごとに1本の木になる。文書を直したら「同期」を押すだけで、木が増えたり更新されたりする。何度押しても木は重複せず、落ちた回数も残る。文書の側は書き換えない
      </Note>

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
                    ? `前回の同期 ${new Date(doc.lastSyncedAt).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}`
                    : 'まだ同期していない'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button kind="text" onClick={() => unlink(doc.docId)} disabled={busy}>
                  外す
                </Button>
                <Button onClick={() => sync([doc.docId])} disabled={busy}>
                  同期
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
          すべて同期
        </Button>
      )}

      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://docs.google.com/document/d/..."
        aria-label="Google ドキュメントの URL"
        autoCapitalize="off"
        spellCheck={false}
        className={`mt-4 ${INPUT_CLASS}`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button kind="solid" onClick={addDoc} disabled={busy || url.trim() === ''}>
          {busy ? '同期中' : 'この文書を登録して同期'}
        </Button>
        <Button
          kind="text"
          onClick={async () => {
            await repository.setGoogleClientId('');
            setSavedClientId('');
          }}
          disabled={busy}
        >
          クライアント ID を変える
        </Button>
      </div>
    </div>
  );
}
