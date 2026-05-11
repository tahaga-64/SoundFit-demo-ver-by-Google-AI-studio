/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =====================================================================
// ai.ts — Claude AI（Anthropic）を使って今日の50曲を選ぶファイル
//
// Claude とは？
//   Anthropicが開発したAIアシスタント。テキストで質問すると
//   テキストで答えてくれる。このアプリでは「音楽キュレーター」として
//   ユーザーの好みに合った曲を50曲選んでもらっている。
//
// claude-haiku-4-5-20251001 とは？
//   Claude の軽量・高速モデル。50曲のJSON生成には十分な性能で、
//   コストも安い（1回あたり約$0.001）。
// =====================================================================

import Anthropic from '@anthropic-ai/sdk';
// ↑ Anthropic の公式 JavaScript ライブラリを読み込む

import { type Song } from './types';
// ↑ types.ts で定義した Song 型を読み込む（型だけ使うので type をつける）

const MODEL = 'claude-haiku-4-5-20251001';
// ↑ 使用するAIモデルの名前。将来モデルを変えるときはここだけ変更する

let client: Anthropic | null = null;
// ↑ Anthropicクライアント（AI通信オブジェクト）。最初は null で、
//   初回呼び出し時に作成する（遅延初期化）。一度作ったら使い回す。


// --- getClient — Anthropicクライアントを取得する内部関数 -------------
// APIキーが設定されていないとエラーを投げる。
// dangerouslyAllowBrowser: true は「ブラウザから直接APIを叩くのを許可する」設定。
// 本来はセキュリティ上NGだが、デモ版なので許可している。
// 本番環境ではサーバー側でAPIを呼び出すべき（issue #27 参照）。
function getClient(): Anthropic {
  if (!client) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    // ↑ import.meta.env は Vite（ビルドツール）が提供する環境変数へのアクセス方法。
    //   .env ファイルや Vercel の環境変数設定から値を読み込む。
    //   VITE_ プレフィックスがついていないとブラウザから読めない。

    if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY が設定されていません');
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}


// --- ask — Claude にテキストで質問して回答を得る内部関数 -------------
// prompt: 質問文（プロンプト）
// maxTokens: 回答の最大文字数（トークン≒単語数）
async function ask(prompt: string, maxTokens = 4096): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    // ↑ role: 'user' は「ユーザーからの質問」を意味する。
    //   'assistant' にすると「AIの回答」として扱われる。
  });

  const block = msg.content[0];
  // ↑ Claude の回答は配列で返ってくる（複数のブロックがある場合もある）。
  //   今回は最初の1つだけ使う。

  return block.type === 'text' ? block.text : '';
  // ↑ テキストブロックなら中身を返す、そうでなければ空文字を返す
}


// --- parseJSON — Claude の回答からJSONを取り出す内部関数 -------------
// Claude はたまに ```json ... ``` のようなマークダウン記法で
// コードブロックを付けてJSONを返すことがある。
// この関数はそのマークダウン部分を取り除いてから JSON.parse する。
function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '') // 先頭の ```json または ``` を削除
    .replace(/\s*```$/, '')           // 末尾の ``` を削除
    .trim();                          // 前後の空白を削除

  const value: unknown = JSON.parse(cleaned);
  // ↑ JSON.parse はJSON文字列をJavaScriptのオブジェクトに変換する。
  //   unknown 型にしてから T 型にキャストしている（型安全のため）。

  return value as T;
}


// --- DEMO_SONGS — APIキー不要で動作確認できるデモ用曲リスト ----------
// APIキーが設定されていない・認証エラーのときに表示するフォールバック曲。
// Pop・Rock・Jazz・Hip-Hopなど幅広いジャンルの名曲30曲。
const DEMO_SONGS: Omit<Song, 'id' | 'albumCover' | 'spotifyId' | 'isSuperLiked'>[] = [
  // Omit<Song, 'id' | 'albumCover' | 'spotifyId' | 'isSuperLiked'> とは？
  // Song 型から id・albumCover・spotifyId・isSuperLiked の4つのプロパティを
  // 除いた型のこと。この段階ではこれらの値がまだ決まっていないため省略する。
  { title: 'Blinding Lights', artist: 'The Weeknd', releaseYear: 2019, releaseMonth: 11, genre: 'Pop' },
  { title: 'As It Was', artist: 'Harry Styles', releaseYear: 2022, releaseMonth: 4, genre: 'Pop' },
  { title: 'HUMBLE.', artist: 'Kendrick Lamar', releaseYear: 2017, releaseMonth: 4, genre: 'Hip-Hop' },
  { title: 'God\'s Plan', artist: 'Drake', releaseYear: 2018, releaseMonth: 1, genre: 'Hip-Hop' },
  { title: 'Shape of You', artist: 'Ed Sheeran', releaseYear: 2017, releaseMonth: 1, genre: 'Pop' },
  { title: 'Levitating', artist: 'Dua Lipa', releaseYear: 2020, releaseMonth: 10, genre: 'Pop' },
  { title: 'Stay With Me', artist: 'Sam Smith', releaseYear: 2014, releaseMonth: 4, genre: 'Soul' },
  { title: 'Happier', artist: 'Marshmello & Bastille', releaseYear: 2018, releaseMonth: 8, genre: 'Electronic' },
  { title: 'Shelter', artist: 'Porter Robinson & Madeon', releaseYear: 2016, releaseMonth: 8, genre: 'Electronic' },
  { title: 'Dynamite', artist: 'BTS', releaseYear: 2020, releaseMonth: 8, genre: 'K-Pop' },
  { title: 'Attention', artist: 'NewJeans', releaseYear: 2022, releaseMonth: 7, genre: 'K-Pop' },
  { title: 'IDOL', artist: 'BTS', releaseYear: 2018, releaseMonth: 8, genre: 'K-Pop' },
  { title: 'Bohemian Rhapsody', artist: 'Queen', releaseYear: 1975, releaseMonth: 10, genre: 'Rock' },
  { title: 'Hotel California', artist: 'Eagles', releaseYear: 1977, releaseMonth: 2, genre: 'Rock' },
  { title: 'Come As You Are', artist: 'Nirvana', releaseYear: 1991, releaseMonth: 3, genre: 'Rock' },
  { title: 'Lose Yourself', artist: 'Eminem', releaseYear: 2002, releaseMonth: 10, genre: 'Hip-Hop' },
  { title: 'N****s in Paris', artist: 'Jay-Z & Kanye West', releaseYear: 2011, releaseMonth: 8, genre: 'Hip-Hop' },
  { title: 'Thriller', artist: 'Michael Jackson', releaseYear: 1982, releaseMonth: 11, genre: 'Pop' },
  { title: 'Purple Rain', artist: 'Prince', releaseYear: 1984, releaseMonth: 7, genre: 'Pop' },
  { title: 'Rolling in the Deep', artist: 'Adele', releaseYear: 2010, releaseMonth: 11, genre: 'Soul' },
  { title: 'Someone Like You', artist: 'Adele', releaseYear: 2011, releaseMonth: 1, genre: 'Soul' },
  { title: 'Superstition', artist: 'Stevie Wonder', releaseYear: 1972, releaseMonth: 10, genre: 'Soul' },
  { title: 'Take Five', artist: 'Dave Brubeck Quartet', releaseYear: 1959, releaseMonth: 1, genre: 'Jazz' },
  { title: 'So What', artist: 'Miles Davis', releaseYear: 1959, releaseMonth: 8, genre: 'Jazz' },
  { title: 'Mr. Brightside', artist: 'The Killers', releaseYear: 2003, releaseMonth: 9, genre: 'Indie' },
  { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', releaseYear: 2013, releaseMonth: 6, genre: 'Indie' },
  { title: 'One More Time', artist: 'Daft Punk', releaseYear: 2000, releaseMonth: 11, genre: 'Electronic' },
  { title: 'Get Lucky', artist: 'Daft Punk', releaseYear: 2013, releaseMonth: 4, genre: 'Electronic' },
  { title: 'Die For You', artist: 'The Weeknd', releaseYear: 2016, releaseMonth: 12, genre: 'R&B' },
  { title: 'No Scrubs', artist: 'TLC', releaseYear: 1999, releaseMonth: 3, genre: 'R&B' },
];

// makeDemoSongs — DEMO_SONGS に id・albumCover・isSuperLiked を付けて Song[] にする
function makeDemoSongs(): Song[] {
  return DEMO_SONGS.map((s, i) => ({
    ...s,               // スプレッド構文：s のプロパティをすべてコピー
    id: `demo-${Date.now()}-${i}`, // ユニークなIDを生成（現在のミリ秒 + 連番）
    albumCover: '',     // 画像なし（グラデーションで代替表示）
    spotifyId: undefined,
    isSuperLiked: false,
  }));
}


// --- selectDailySongs — 今日の50曲を取得するメイン関数 ---------------
// 外部から呼び出される唯一の公開関数（export がついている）。
//
// 動作フロー:
//   1. APIキーがなければデモ曲を返す
//   2. APIキーがあれば Claude にプロンプトを送って50曲のJSONをもらう
//   3. APIが失敗した場合もデモ曲を返す（フォールバック）
//
// genres:  ユーザーが選んだジャンルのリスト（例: ["Pop", "Rock"]）
// artists: ユーザーが入力したアーティストのリスト（例: ["Taylor Swift"]）
export async function selectDailySongs(
  genres: string[],
  artists: string[]
): Promise<Song[]> {

  // APIキーがなければデモ曲を返す（Vercelに環境変数が未設定の場合など）
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return makeDemoSongs();

  // Claude への質問文（プロンプト）を組み立てる
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

  try {
    // Claude に質問する（max_tokens: 4096 は回答の最大長）
    const text = await ask(prompt, 4096);

    // Claude が返したJSON文字列をパース（解析）して配列にする
    type RawSong = {
      title: string;
      artist: string;
      releaseYear: number;
      releaseMonth?: number;
      genre: string;
    };
    // ↑ RawSong は Claude が返すJSONの1要素の型（albumCoverなどはまだない）

    const rawSongs = parseJSON<RawSong[]>(text);

    // rawSongs 配列を Song 型に変換して返す
    return rawSongs.map((s, i) => ({
      id: `song-${Date.now()}-${i}`, // ユニークIDを生成
      title: s.title,
      artist: s.artist,
      releaseYear: s.releaseYear,
      releaseMonth: s.releaseMonth,
      genre: s.genre,
      albumCover: '', // この時点では空。後で Spotify API で画像URLを補完する
      spotifyId: undefined,
      isSuperLiked: false,
    }));

  } catch {
    // 401エラー・ネットワーク障害・JSONパース失敗などの場合はデモ曲を返す
    return makeDemoSongs();
  }
}
