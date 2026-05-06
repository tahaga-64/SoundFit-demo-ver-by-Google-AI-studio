/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompatibilityResult {
  score: number;
  insight: string;
  reasons: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface MusicProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  avatar: string;
  favoriteArtists: string[];
  genres: string[];
  topTrack?: string;
  compatibility?: number; // 0-100%
  listeningNow?: string;
  aiInsight?: string;
}

export const DUMMY_PROFILES: MusicProfile[] = [
  {
    id: "1",
    name: "ユウキ",
    age: 24,
    bio: "テクノが人生。一緒にフェスに行ける人を探してます！ 🎧",
    avatar: "https://images.unsplash.com/photo-1514525253361-b83f859b73c0?w=800&q=80",
    favoriteArtists: ["Aphex Twin", "Four Tet", "Peggy Gou"],
    genres: ["Techno", "House", "Ambient"],
    topTrack: "Glue - Bicep",
    compatibility: 94,
    listeningNow: "Pulse - Peggy Gou",
    aiInsight: "二人ともUKエレクトロニカのミニマリズムに深い造詣があります。最近のBicepのライブ演出について盛り上がれそうです。"
  },
  {
    id: "2",
    name: "ハルト",
    age: 27,
    bio: "クラシックロックとレコード収集が趣味。70年代のバイブスについて語りましょう。",
    avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
    favoriteArtists: ["Pink Floyd", "Led Zeppelin", "The Who"],
    genres: ["Classic Rock", "Blues", "Psych Rock"],
    topTrack: "Comfortably Numb - Pink Floyd",
    compatibility: 82,
    listeningNow: "Echoes - Pink Floyd",
    aiInsight: "プログレの壮大な構成美を愛する二人は、深夜のディープな音楽談義に最適。ピンク・フロイドのギルモアのトーンについて語り合えます。"
  },
  {
    id: "3",
    name: "ミナ",
    age: 22,
    bio: "K-PopとJ-Popが大好き。ダンスもやってます！ ✨",
    avatar: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=800&q=80",
    favoriteArtists: ["NewJeans", "YOASOBI", "TWICE"],
    genres: ["K-Pop", "J-Pop", "City Pop"],
    topTrack: "Ditto - NewJeans",
    compatibility: 75,
    listeningNow: "アイドル - YOASOBI",
    aiInsight: "キャッチーなメロディと洗練されたビート感の好みが一致。NewJeansのクリエイティブ・ディレクションについて意見交換してみては？"
  },
  {
    id: "4",
    name: "ケンジ",
    age: 29,
    bio: "ジャズピアニスト。コーヒーとマイルス・デイヴィスが朝のルーティン。",
    avatar: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&q=80",
    favoriteArtists: ["Miles Davis", "Bill Evans", "John Coltrane"],
    genres: ["Jazz", "Soul", "Funk"],
    topTrack: "So What - Miles Davis",
    compatibility: 88,
    listeningNow: "Autumn Leaves - Bill Evans",
    aiInsight: "即興演奏の緊張感を好む、ストイックなジャズ好きコンビ。ビル・エヴァンスの繊細なタッチについての共通言語を持っています。"
  }
];
