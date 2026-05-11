/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Anthropic from '@anthropic-ai/sdk';
import { type Song } from './types';

const MODEL = 'claude-haiku-4-5-20251001';

let client: Anthropic | null = null;
// Anthropic クライアントを遅延初期化して返す。APIキーが未設定の場合はエラーをスローする。
// NOTE: dangerouslyAllowBrowser はデモ用途のみ。本番ではサーバーサイドプロキシ経由にすること。
function getClient(): Anthropic {
  if (!client) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY が設定されていません');
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

// 指定したプロンプトを Claude Haiku に送信し、テキスト応答を返す内部関数。
async function ask(prompt: string, maxTokens = 4096): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

// Claude がマークダウンのコードブロック（```json ... ```）で返した応答を除去してから JSON としてパースする。
// JSON.parse の戻り値は unknown 経由で T にキャストする。スキーマ検証なしのため呼び出し元で try/catch すること。
function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const value: unknown = JSON.parse(cleaned);
  return value as T;
}

// ユーザーの好きなジャンル・アーティストから今日の50曲をセレクトして返す。
// AIが曲名・アーティスト・リリース年・ジャンルを含むJSON配列を生成する。
// albumCover はこの時点では空文字（後続の fetchAlbumCovers で補完する）。
export async function selectDailySongs(
  genres: string[],
  artists: string[]
): Promise<Song[]> {
  const prompt = `あなたは音楽キュレーターの専門家です。
以下のユーザーの音楽の好みに基づいて、今日のおすすめ曲を50曲セレクトしてください。

好きなジャンル: ${genres.join(', ')}
好きなアーティスト・バンド: ${artists.join(', ')}

以下の条件でセレクトしてください:
- ユーザーの好みに合った曲を中心に、新しい発見になる曲も含める
- 同じアーティストの曲は最大3曲まで
- 有名曲・隠れた名曲をバランスよく
- リリース年は1960年代〜2025年まで幅広く

以下のJSON配列形式のみで回答してください（余計なテキスト・説明は一切不要）:
[
  {
    "title": "曲名",
    "artist": "アーティスト名",
    "releaseYear": 発売年(整数),
    "releaseMonth": 発売月(1-12の整数、不明な場合は省略),
    "genre": "ジャンル名（英語）"
  }
]
必ず50曲分のデータを返してください。`;

  const text = await ask(prompt, 4096);

  type RawSong = {
    title: string;
    artist: string;
    releaseYear: number;
    releaseMonth?: number;
    genre: string;
  };

  const rawSongs = parseJSON<RawSong[]>(text);

  return rawSongs.map((s, i) => ({
    id: `song-${Date.now()}-${i}`,
    title: s.title,
    artist: s.artist,
    releaseYear: s.releaseYear,
    releaseMonth: s.releaseMonth,
    genre: s.genre,
    albumCover: '', // fetchAlbumCovers で後から補完する
    spotifyId: undefined,
    isSuperLiked: false,
  }));
}
