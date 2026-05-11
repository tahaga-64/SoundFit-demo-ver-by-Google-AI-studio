/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Anthropic from '@anthropic-ai/sdk';
import { type Song } from './types';

const MODEL = 'claude-haiku-4-5-20251001';

let client: Anthropic | null = null;
// NOTE: dangerouslyAllowBrowser はデモ用途のみ。本番ではサーバーサイドプロキシ経由にすること。
function getClient(): Anthropic {
  if (!client) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY が設定されていません');
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

async function ask(prompt: string, maxTokens = 4096): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const value: unknown = JSON.parse(cleaned);
  return value as T;
}

// APIキー未設定・認証エラー時に表示するデモ用フォールバック曲（30曲）
const DEMO_SONGS: Omit<Song, 'id' | 'albumCover' | 'spotifyId' | 'isSuperLiked'>[] = [
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

function makeDemoSongs(): Song[] {
  return DEMO_SONGS.map((s, i) => ({
    ...s,
    id: `demo-${Date.now()}-${i}`,
    albumCover: '',
    spotifyId: undefined,
    isSuperLiked: false,
  }));
}

export async function selectDailySongs(
  genres: string[],
  artists: string[]
): Promise<Song[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return makeDemoSongs();

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
      albumCover: '',
      spotifyId: undefined,
      isSuperLiked: false,
    }));
  } catch {
    // 認証エラー・ネットワーク障害時はデモ曲にフォールバック
    return makeDemoSongs();
  }
}
