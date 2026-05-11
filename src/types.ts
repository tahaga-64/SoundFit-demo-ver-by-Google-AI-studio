/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =====================================================================
// types.ts — アプリ全体で使う「型」と「定数データ」をまとめたファイル
//
// 「型（Type / Interface）」とは？
//   オブジェクトがどんなプロパティを持つかをあらかじめ決めるルール。
//   例えば Song 型を定義すると「title は文字列、releaseYear は数値」と
//   決まり、間違ったデータを使おうとすると TypeScript がエラーを出してくれる。
// =====================================================================


// --- Song（曲） -------------------------------------------------------
// スワイプカードに表示する1曲分のデータ構造。
// AIが曲名・アーティスト・ジャンルを生成し、
// Spotifyが albumCover（アルバムカバー画像URL）を補完する。
export interface Song {
  id: string;            // アプリ内で曲を一意に識別するID（例: "song-1716300000-0"）
  title: string;         // 曲名
  artist: string;        // アーティスト名
  releaseYear: number;   // 発売年（例: 2024）
  releaseMonth?: number; // 発売月（1〜12）。? がつくと「省略可能」の意味
  genre: string;         // ジャンル名（英語、例: "Pop"）
  albumCover: string;    // アルバムカバー画像のURL。取得できなければグラデーションで代替
  spotifyId?: string;    // SpotifyのトラックID。あればSpotify直リンクに使う
  previewUrl?: string;   // Deezerの30秒試聴MP3のURL（取得できない場合は省略）
  isSuperLiked: boolean; // 上スワイプ（★スーパーLIKE）されたかどうか
}
// ↑ interface とは「このオブジェクトはこのプロパティを持つ」という設計図。


// --- PlaylistItem（プレイリストに追加した曲） -------------------------
// ユーザーが右or上スワイプした曲をプレイリストに保存するときの形式。
// 「いつ追加したか」「★かどうか」を曲データに付け加えた構造。
export interface PlaylistItem {
  song: Song;            // 曲の情報（上の Song 型がそのまま入る）
  addedAt: string;       // 追加した日時（ISO形式、例: "2024-05-11T12:00:00.000Z"）
  isSuperLiked: boolean; // true なら ★ マーク付きで表示する
}


// --- FriendAccount（フレンドアカウント） ------------------------------
// アプリ内のフレンド機能で使うユーザーのデータ構造。
// 現在はデモ用の固定データ（DEMO_FRIENDS）として下に定義してある。
export interface FriendAccount {
  id: string;            // 英数字6文字のユーザーID（例: "RK9M2X"）。検索に使う
  name: string;          // 表示名（例: "ソウタ"）
  avatar: string;        // プロフィール画像のURL
  topGenres: string[];   // 好きなジャンルのリスト（例: ["R&B", "Pop"]）
  currentlyListening?: { // 今聴いている曲。聴いていない場合は undefined（省略）
    title: string;       // 曲名
    artist: string;      // アーティスト名
  };
  isAdded: boolean;      // 自分がこのフレンドを追加済みかどうか
}


// --- UserPreferences（ユーザーの音楽の好み） --------------------------
// 初回起動時のオンボーディング（3ステップ入力）で収集する情報。
// AIへのプロンプトに使い、50曲を選んでもらうための材料になる。
export interface UserPreferences {
  name: string;       // ニックネーム（Step1で入力）
  genres: string[];   // 好きなジャンルのリスト（Step2で選択）
  artists: string[];  // 好きなアーティストのリスト（Step3で入力）
}


// --- Message（チャットメッセージ） ------------------------------------
// 将来のチャット機能のために型定義だけ残しておく（現在は未使用）。
export interface Message {
  id: string;         // メッセージの一意ID
  senderId: string;   // 送信者のユーザーID
  text: string;       // メッセージ本文
  timestamp: string;  // 送信日時（ISO形式）
}


// --- DEMO_FRIENDS（デモ用フレンドアカウント5件） ----------------------
// フレンド検索機能を体験できるようにあらかじめ用意したダミーデータ。
// アプリの検索欄にこれらのIDを入力すると見つかる（例: "RK9M2X"）。
// 本番ではデータベースから取得するが、デモなのでここに直書きしている。
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
    currentlyListening: undefined, // 今は何も聴いていない
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
// ↑ export const とすることで、他のファイルから import して使えるようになる。


// --- GENRE_COLORS（ジャンル別グラデーション色） -----------------------
// Spotifyのアルバムカバーが取得できないとき（未ログイン時など）に
// 代わりに表示するグラデーション背景の色設定。
// Tailwind CSS のクラス名を使っている。
// "from-X to-Y" は「Xの色からYの色へグラデーション」を意味する。
// Record<string, string> は「キーも値も文字列のオブジェクト」という型。
export const GENRE_COLORS: Record<string, string> = {
  'Pop':        'from-pink-600 to-rose-900',     // ピンク〜ローズ
  'Rock':       'from-red-700 to-neutral-900',   // 赤〜暗いグレー
  'Jazz':       'from-amber-700 to-neutral-900', // 琥珀色〜暗いグレー
  'Hip-Hop':    'from-violet-700 to-neutral-900',// 紫〜暗いグレー
  'Electronic': 'from-cyan-600 to-blue-900',     // シアン〜紺
  'Classical':  'from-yellow-700 to-neutral-900',// 黄〜暗いグレー
  'K-Pop':      'from-fuchsia-600 to-purple-900',// フクシア〜紫
  'J-Pop':      'from-orange-500 to-rose-900',   // オレンジ〜ローズ
  'R&B':        'from-purple-700 to-neutral-900',// 紫〜暗いグレー
  'Metal':      'from-zinc-600 to-neutral-950',  // 亜鉛色〜ほぼ黒
  'Folk':       'from-green-700 to-neutral-900', // 緑〜暗いグレー
  'Indie':      'from-teal-600 to-neutral-900',  // ティール〜暗いグレー
  'Soul':       'from-orange-700 to-neutral-900',// 濃いオレンジ〜暗いグレー
  'Reggae':     'from-lime-600 to-green-900',    // ライム〜濃い緑
  'Latin':      'from-red-500 to-yellow-700',    // 赤〜黄
};
