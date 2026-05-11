/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// スワイプカードで表示する1曲分の情報。AIが生成し、Spotify検索でアルバムカバーを補完する。
export interface Song {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  releaseMonth?: number;
  genre: string;
  albumCover: string; // Spotify画像URL、またはジャンル別グラデーションプレースホルダー
  spotifyId?: string;
  previewUrl?: string; // Deezer 30秒プレビューMP3 URL
  isSuperLiked: boolean;
}

// 今日のプレイリストに追加された曲。isSuperLiked が true のとき ★ マークを付ける。
export interface PlaylistItem {
  song: Song;
  addedAt: string; // ISO timestamp
  isSuperLiked: boolean;
}

// デモ用フレンドアカウント。IDで検索・追加できる。currentlyListening は今聞いている曲。
export interface FriendAccount {
  id: string; // 英数字6文字、例: "RK9M2X"
  name: string;
  avatar: string;
  topGenres: string[];
  currentlyListening?: { title: string; artist: string };
  isAdded: boolean;
}

// アプリ初回設定時にユーザーが入力する好みの情報。AIの50曲セレクトに使用する。
export interface UserPreferences {
  name: string;
  genres: string[];
  artists: string[];
}

// チャット画面で表示する1件のメッセージ（将来の機能拡張のために型定義を保持）
export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

// デモ用フレンドアカウント5件。IDをアカウント検索欄に入力すると見つかる。
export const DEMO_FRIENDS: FriendAccount[] = [
  {
    id: 'RK9M2X',
    name: 'ソウタ',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
    topGenres: ['R&B', 'Pop'],
    currentlyListening: { title: 'Die For You', artist: 'The Weeknd' },
    isAdded: false,
  },
  {
    id: 'LB4N7P',
    name: 'アヤカ',
    avatar: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400&q=80',
    topGenres: ['K-Pop', 'J-Pop'],
    currentlyListening: { title: 'Attention', artist: 'NewJeans' },
    isAdded: false,
  },
  {
    id: 'TW6H3Q',
    name: 'ユイ',
    avatar: 'https://images.unsplash.com/photo-1514525253361-b83f859b73c0?w=400&q=80',
    topGenres: ['Indie', 'Folk'],
    currentlyListening: undefined,
    isAdded: false,
  },
  {
    id: 'MZ8J5A',
    name: 'コウキ',
    avatar: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&q=80',
    topGenres: ['Hip-Hop', 'Trap'],
    currentlyListening: { title: 'HUMBLE.', artist: 'Kendrick Lamar' },
    isAdded: false,
  },
  {
    id: 'FX2C9D',
    name: 'リナ',
    avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    topGenres: ['Electronic', 'House'],
    currentlyListening: { title: 'Shelter', artist: 'Porter Robinson' },
    isAdded: false,
  },
];

// ジャンルごとのTailwindグラデーションクラス（Spotifyトークンなし時のプレースホルダー背景）
export const GENRE_COLORS: Record<string, string> = {
  'Pop':        'from-pink-600 to-rose-900',
  'Rock':       'from-red-700 to-neutral-900',
  'Jazz':       'from-amber-700 to-neutral-900',
  'Hip-Hop':    'from-violet-700 to-neutral-900',
  'Electronic': 'from-cyan-600 to-blue-900',
  'Classical':  'from-yellow-700 to-neutral-900',
  'K-Pop':      'from-fuchsia-600 to-purple-900',
  'J-Pop':      'from-orange-500 to-rose-900',
  'R&B':        'from-purple-700 to-neutral-900',
  'Metal':      'from-zinc-600 to-neutral-950',
  'Folk':       'from-green-700 to-neutral-900',
  'Indie':      'from-teal-600 to-neutral-900',
  'Soul':       'from-orange-700 to-neutral-900',
  'Reggae':     'from-lime-600 to-green-900',
  'Latin':      'from-red-500 to-yellow-700',
};
