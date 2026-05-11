/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =====================================================================
// deezer.ts — Deezer（音楽サービス）から30秒試聴URLを取得するファイル
//
// Deezer とは？
//   フランス発の音楽ストリーミングサービス。Spotifyと似ているが、
//   検索APIが無料・ログイン不要・ブラウザから直接使える（CORS対応済み）。
//
// なぜ Spotify ではなく Deezer を使うのか？
//   Spotify の試聴URL（preview_url）は2024年11月以降、新規取得が
//   できなくなった。Deezer は今でも30秒のMP3プレビューを提供している。
// =====================================================================


// fetchPreviewUrl — 曲名とアーティスト名から30秒試聴URLを取得する関数
//
// 引数:
//   title  — 曲名（例: "Blinding Lights"）
//   artist — アーティスト名（例: "The Weeknd"）
//
// 戻り値:
//   見つかれば MP3 の URL 文字列、見つからなければ null
//
// Promise とは？
//   インターネット通信は時間がかかるので「後で結果が返ってくる約束」を
//   表すのが Promise。async/await を使うと待ちやすく書ける。
export async function fetchPreviewUrl(title: string, artist: string): Promise<string | null> {
  try {
    // 検索クエリを URL で安全に送れる形式に変換する（スペースや特殊文字をエンコード）
    const q = encodeURIComponent(`artist:"${artist}" track:"${title}"`);

    // Deezer の検索APIにリクエストを送る（limit=1 で最初の1件だけ返す）
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1&output=json`);

    // 通信に失敗した場合（サーバーエラーなど）は null を返す
    if (!res.ok) return null;

    // JSON形式のレスポンスをJavaScriptのオブジェクトに変換する
    const data = await res.json();

    // data.data[0].preview に試聴URLが入っている。なければ null を返す
    // ?. は「プロパティが存在する場合だけアクセスする」オプショナルチェーン
    // ?? は「左辺が null/undefined なら右辺を使う」ヌル合体演算子
    return (data?.data?.[0]?.preview as string) ?? null;

  } catch {
    // ネットワーク障害などで fetch 自体がエラーになった場合も null を返す
    return null;
  }
}
