/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Deezer Search API でプレビュー URL を取得する。認証不要・CORS 対応済み。
// プレビューは最長 30 秒の MP3 で、サビ付近から始まることが多い。
export async function fetchPreviewUrl(title: string, artist: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1&output=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data?.[0]?.preview as string) ?? null;
  } catch {
    return null;
  }
}
