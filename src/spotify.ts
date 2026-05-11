/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =====================================================================
// spotify.ts — Spotify Web API との通信をまとめたファイル
//
// Spotify API でできること（このアプリでの使用箇所）:
//   - ログイン（PKCE認証フロー）
//   - アルバムカバー画像の取得（曲名+アーティスト名で検索）
//   - 自分のプロフィール取得（名前・アバター・よく聴く曲）
//
// PKCE認証とは？
//   パスワードなしでSpotifyにログインする安全な方法。
//   1. アプリ → Spotifyの認証画面へリダイレクト
//   2. ユーザーがSpotifyでログイン・許可
//   3. Spotify → アプリのURLにコードを付けてリダイレクト
//   4. アプリがコードとアクセストークンを交換する
// =====================================================================

// Vercelの環境変数 VITE_SPOTIFY_CLIENT_ID から SpotifyアプリのIDを読み込む
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '';

// Spotifyログイン後のリダイレクト先URL（= このアプリ自身のURL）
const REDIRECT_URI = window.location.origin;

// Spotifyに要求する権限のリスト（スペース区切り）
// user-top-read: よく聴くアーティスト・曲の取得
// user-read-currently-playing: 現在再生中の曲の取得
// user-read-private: プロフィール情報の取得
// user-library-read: ライブラリの取得
const SCOPES = 'user-top-read user-read-currently-playing user-read-private user-library-read';

// セッションストレージに保存するキー名（タブを閉じると消える）
const TOKEN_KEY = 'spotify_access_token';     // アクセストークン保存用
const VERIFIER_KEY = 'spotify_code_verifier'; // PKCE用コード検証子保存用


// --- randomString — 安全なランダム文字列を生成する -------------------
// PKCE認証の「コード検証子」に使う128文字のランダム文字列を作る。
// crypto.getRandomValues はブラウザのセキュアな乱数APIで Math.random() より安全。
function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(buf, v => chars[v % chars.length]).join('');
}


// --- sha256Base64URL — SHA-256ハッシュ化してBase64URL形式に変換 ------
// PKCE の「コードチャレンジ」を作るために使う。
// ハッシュ化とは元の文字列を別の固定長の文字列に変換すること（一方向・不可逆）。
// Base64URL は URL で安全に送れる文字エンコード（+→- /→_ =削除）。
async function sha256Base64URL(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(Array.from(new Uint8Array(digest), b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


// --- loginWithSpotify — Spotifyのログイン画面へ遷移する --------------
// プロフィールページの「Connect Spotify」ボタンを押したときに呼ばれる。
// 認証後、このアプリのURLに戻ってきて handleCallback が処理を引き継ぐ。
export async function loginWithSpotify(): Promise<void> {
  const verifier = randomString(128);
  const challenge = await sha256Base64URL(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  // ↑ コード検証子をセッションストレージに保存（認証後の交換で使う）

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}


// --- handleCallback — Spotifyからのコールバックを処理する ------------
// Spotifyでログイン後、URLに付いてきた認証コードをトークンに交換する。
// React StrictMode では2回実行されるため、コードをURLから削除してから交換する。
export async function handleCallback(): Promise<string | null> {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return null;

  // URLからコードを削除（ブラウザ履歴をきれいにする）
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;
  sessionStorage.removeItem(VERIFIER_KEY);

  try {
    // Spotifyのトークンエンドポイントに認証コードと検証子を送り、
    // アクセストークンを受け取る
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    });
    if (!res.ok) {
      console.error('Spotify token exchange failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const token: unknown = data?.access_token;
    if (typeof token !== 'string') return null;
    sessionStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (e) {
    console.error('Spotify token exchange error:', e);
    return null;
  }
}


// --- getStoredToken — 保存済みトークンを取得する ---------------------
// セッションストレージからアクセストークンを取り出す。
// タブを閉じると消える（sessionStorage の仕様）のでリロード後も維持される。
export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}


// --- clearToken — トークンを削除する（ログアウト用）-----------------
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}


// --- spotifyGet — Spotify APIへのGETリクエストを行う内部ヘルパー ----
// path: APIのパス（例: "/me"、"/search?q=..."）
// token: アクセストークン（Authorizationヘッダーに付けて送る）
// 204 No Content はコンテンツなし（再生中でないなど）なので null を返す
async function spotifyGet(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // ↑ "Bearer トークン" 形式で認証情報をヘッダーに付ける（Spotify APIの仕様）
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${path}`);
  return res.json();
}


// --- fetchMySpotifyProfile — 自分のSpotifyプロフィールを取得 ---------
// プロフィールページ表示・Spotify連携確認に使う。
// 3つのAPIを並列で呼んで、名前・アバター・よく聴く曲などをまとめて返す。
export async function fetchMySpotifyProfile(token: string): Promise<{
  name: string;
  avatar: string;
  genres: string[];
  artists: string[];
  topTracks: { title: string; artist: string; albumCover: string }[];
  currentlyListening?: { title: string; artist: string };
}> {
  // Promise.all で3つのAPIを並列で呼び出す（順番に呼ぶより速い）
  const [me, topArtists, topTracks] = await Promise.all([
    spotifyGet('/me', token),
    spotifyGet('/me/top/artists?limit=10&time_range=medium_term', token),
    // ↑ 過去6ヶ月のトップ10アーティスト（medium_term = 約6ヶ月）
    spotifyGet('/me/top/tracks?limit=5&time_range=medium_term', token),
    // ↑ 過去6ヶ月のトップ5曲
  ]);

  // 現在再生中の曲を取得（再生していないとエラーになるので try/catch）
  let currentlyListening: { title: string; artist: string } | undefined;
  try {
    const playing = await spotifyGet('/me/player/currently-playing', token);
    if (playing?.is_playing && playing?.item) {
      currentlyListening = {
        title: playing.item.name,
        artist: playing.item.artists[0].name,
      };
    }
  } catch { /* 再生中でない場合は無視 */ }

  const artists: { name: string; genres: string[] }[] = topArtists?.items ?? [];
  const tracks: { name: string; artists: { name: string }[]; album: { images: { url: string }[] } }[] =
    topTracks?.items ?? [];

  return {
    name: me?.display_name ?? 'Me',
    avatar: me?.images?.[0]?.url ?? '',
    genres: [...new Set(artists.flatMap((a) => a.genres))],
    // ↑ 全アーティストのジャンルをまとめて、Set で重複を除去する
    artists: artists.slice(0, 5).map((a) => a.name),
    topTracks: tracks.map((t) => ({
      title: t.name,
      artist: t.artists[0]?.name ?? '',
      albumCover: t.album?.images?.[0]?.url ?? '',
    })),
    currentlyListening,
  };
}


// --- fetchAlbumCovers — 曲リストのアルバムカバーをまとめて取得 -------
// AIが生成した曲リストに対して Spotify の検索APIで画像URLとIDを付与する。
// "曲名|アーティスト名" をキーとするオブジェクトを返す。
// 例: { "Blinding Lights|The Weeknd": { albumCover: "https://...", spotifyId: "abc" } }
//
// 10件ずつバッチ処理するのは Spotify APIのレート制限を避けるため。
export async function fetchAlbumCovers(
  songs: Array<{ title: string; artist: string }>,
  token: string
): Promise<Record<string, { albumCover: string; spotifyId: string }>> {
  const result: Record<string, { albumCover: string; spotifyId: string }> = {};

  const batchSize = 10;
  for (let i = 0; i < songs.length; i += batchSize) {
    const batch = songs.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (song) => {
        const key = `${song.title}|${song.artist}`;
        try {
          const q = encodeURIComponent(`track:${song.title} artist:${song.artist}`);
          const data = await spotifyGet(`/search?q=${q}&type=track&limit=1`, token);
          const track = data?.tracks?.items?.[0];
          if (track) {
            result[key] = {
              albumCover: track.album?.images?.[0]?.url ?? '',
              spotifyId: track.id ?? '',
            };
          }
        } catch {
          // 1曲の取得失敗が全体に影響しないよう空文字で記録（プレースホルダー表示）
          result[key] = { albumCover: '', spotifyId: '' };
        }
      })
    );
  }

  return result;
}
