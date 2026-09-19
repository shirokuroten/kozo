import type { GoogleDoc } from '../domain/gdoc';

// Google との通信はここに閉じ込める。
// ブラウザだけで完結するトークンフローを使う。必要なのは公開前提のクライアント ID だけで、
// 秘密鍵は存在しない。トークンは保存せず、メモリ上に期限まで持つだけにする

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/documents.readonly';
const FIELDS =
  'title,body(content(paragraph(elements(textRun(content)),bullet(listId,nestingLevel),paragraphStyle(namedStyleType))))';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string }) => void;
          }): TokenClient;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;

// ログインの小窓は利用者の操作の直後でないと開けないブラウザがあるので、画面を開いた時点で先に読み込んでおく
export function loadGoogleSignIn(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  gisLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = null;
      reject(new Error('Google に接続できない。通信できる場所で試す'));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

let cached: { clientId: string; token: string; expiresAt: number } | null = null;

export async function getAccessToken(clientId: string): Promise<string> {
  if (cached && cached.clientId === clientId && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  await loadGoogleSignIn();
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(`Google の許可が得られなかった（${response.error ?? '不明'}）`));
          return;
        }
        cached = {
          clientId,
          token: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 0) * 1000,
        };
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(
          new Error(
            error.type === 'popup_closed'
              ? 'ログインの窓が閉じられた'
              : 'ログインの窓を開けなかった。ポップアップの禁止を解除する',
          ),
        );
      },
    });
    client.requestAccessToken();
  });
}

export async function fetchGoogleDoc(docId: string, token: string): Promise<GoogleDoc> {
  const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}?fields=${encodeURIComponent(FIELDS)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) {
    cached = null;
    throw new Error('ログインの期限が切れた。もう一度同期する');
  }
  if (response.status === 403) throw new Error('この文書を読む権限がない');
  if (response.status === 404) throw new Error('文書が見つからない');
  if (!response.ok) throw new Error(`Google から読めなかった（${response.status}）`);
  return (await response.json()) as GoogleDoc;
}
