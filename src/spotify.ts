/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type MusicProfile } from './types';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '';
const REDIRECT_URI = window.location.origin;
const SCOPES = 'user-top-read user-read-currently-playing user-read-private';
const TOKEN_KEY = 'spotify_access_token';
const VERIFIER_KEY = 'spotify_code_verifier';

// PKCE 認証に使う安全なランダム文字列（コード検証子）を生成する。crypto.getRandomValues で暗号的に安全な乱数を使用する。
function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(buf, v => chars[v % chars.length]).join('');
}

// 文字列を SHA-256 でハッシュ化し、Base64URL 形式（URL セーフ、パディングなし）に変換する。PKCE のコードチャレンジ生成に使用する。
async function sha256Base64URL(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(Array.from(new Uint8Array(digest), b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// PKCE フローを開始する。コード検証子をセッションに保存し、Spotify の認証画面へリダイレクトする。
export async function loginWithSpotify(): Promise<void> {
  const verifier = randomString(128);
  const challenge = await sha256Base64URL(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

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

// Spotify からのリダイレクトを受け取り、URL の認証コードをアクセストークンに交換してセッションに保存する。
// React StrictMode の二重実行を防ぐため、コードを URL から削除してからトークン交換を行う。
export async function handleCallback(): Promise<string | null> {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return null;

  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;
  sessionStorage.removeItem(VERIFIER_KEY);

  try {
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

// セッションストレージから保存済みの Spotify アクセストークンを取得する。未ログインなら null を返す。
export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

// セッションストレージのアクセストークンを削除する（ログアウト用）。
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Spotify Web API への GET リクエストを行う内部ヘルパー。204 No Content は null を返す。
async function spotifyGet(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${path}`);
  return res.json();
}

// ログイン中ユーザーのプロフィール・トップアーティスト・トップトラック・現在再生中の曲を並行取得し、MusicProfile 形式に変換して返す。
export async function fetchMySpotifyProfile(token: string): Promise<Partial<MusicProfile>> {
  const [me, topArtists, topTracks] = await Promise.all([
    spotifyGet('/me', token),
    spotifyGet('/me/top/artists?limit=10&time_range=medium_term', token),
    spotifyGet('/me/top/tracks?limit=5&time_range=medium_term', token),
  ]);

  let listeningNow: string | undefined;
  try {
    const playing = await spotifyGet('/me/player/currently-playing', token);
    if (playing?.is_playing && playing?.item) {
      listeningNow = `${playing.item.name} - ${playing.item.artists[0].name}`;
    }
  } catch { /* 再生中でない場合は無視 */ }

  const artists: { name: string; genres: string[] }[] = topArtists?.items ?? [];
  const tracks: { name: string; artists: { name: string }[] }[] = topTracks?.items ?? [];

  return {
    name: me?.display_name ?? 'Me',
    avatar: me?.images?.[0]?.url ?? '',
    favoriteArtists: artists.slice(0, 5).map(a => a.name),
    genres: [...new Set(artists.flatMap(a => a.genres))],
    topTrack: tracks[0] ? `${tracks[0].name} - ${tracks[0].artists[0].name}` : undefined,
    listeningNow,
  };
}
