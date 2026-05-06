/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type MusicProfile } from './types';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? '';
const REDIRECT_URI = window.location.origin;
const SCOPES = 'user-top-read user-read-currently-playing user-read-private';
const TOKEN_KEY = 'spotify_access_token';
const VERIFIER_KEY = 'spotify_code_verifier';

function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(buf, v => chars[v % chars.length]).join('');
}

async function sha256Base64URL(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

export async function handleCallback(): Promise<string | null> {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return null;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;

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
  if (!res.ok) return null;

  const { access_token: token } = await res.json();
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.removeItem(VERIFIER_KEY);

  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  return token as string;
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function spotifyGet(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${path}`);
  return res.json();
}

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
