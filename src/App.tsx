/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import {
  Music, Star, X, Heart, User, Users, ListMusic,
  Search, Plus, Check, AudioLines, Sparkles, Loader2,
  Copy, ChevronRight, ExternalLink, Bell, Pause, Play, Volume2, VolumeX,
} from 'lucide-react';
import {
  type Song, type PlaylistItem, type FriendAccount, type UserPreferences,
  DEMO_FRIENDS, GENRE_COLORS,
} from './types';
import { selectDailySongs } from './ai';
import {
  loginWithSpotify, handleCallback, getStoredToken, clearToken,
  fetchMySpotifyProfile, fetchAlbumCovers,
} from './spotify';
import { fetchPreviewUrl } from './deezer';

// ---- localStorage ヘルパー ----------------------------------------

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function todayKey() {
  return `sf_daily_${new Date().toISOString().slice(0, 10)}`;
}

// ---- ユーザーID 生成 ------------------------------------------------

function getOrCreateUserId(): string {
  const existing = localStorage.getItem('sf_user_id');
  if (existing) return existing;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = crypto.getRandomValues(new Uint8Array(6));
  const id = Array.from(buf, b => chars[b % chars.length]).join('');
  localStorage.setItem('sf_user_id', id);
  return id;
}

// ---- ジャンル別プレースホルダー背景 ---------------------------------

function AlbumPlaceholder({ genre, size = 'full' }: { genre: string; size?: 'full' | 'sm' }) {
  const gradient = GENRE_COLORS[genre] ?? 'from-neutral-700 to-neutral-900';
  return (
    <div className={`bg-gradient-to-br ${gradient} ${size === 'full' ? 'w-full h-full' : 'w-full h-full'} flex items-center justify-center`}>
      <Music size={size === 'sm' ? 20 : 48} className="text-white/30" />
    </div>
  );
}

// ---- SplashScreen --------------------------------------------------

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[200] bg-[#0a0502] flex flex-col items-center justify-center"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-rose-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/30"
      >
        <Music className="text-white" size={48} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 text-center">
        <h1 className="text-4xl font-black tracking-tighter text-white italic uppercase">SoundFit</h1>
        <p className="text-xs text-orange-500/60 font-mono tracking-widest uppercase mt-2">Discover Your Sound</p>
      </motion.div>
    </motion.div>
  );
}

// ---- OnboardingScreen ----------------------------------------------

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Jazz', 'Hip-Hop', 'Electronic', 'Classical',
  'K-Pop', 'J-Pop', 'R&B', 'Metal', 'Folk', 'Indie', 'Soul', 'Reggae', 'Latin',
];

function OnboardingScreen({ onComplete }: { onComplete: (prefs: UserPreferences) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState('');
  const [artists, setArtists] = useState<string[]>([]);

  const toggleGenre = (g: string) =>
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const addArtist = () => {
    const trimmed = artistInput.trim();
    if (trimmed && !artists.includes(trimmed)) setArtists(prev => [...prev, trimmed]);
    setArtistInput('');
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[#0a0502] flex flex-col items-center justify-center px-6">
      {/* Steps indicator */}
      <div className="flex gap-2 mb-10">
        {([1, 2, 3] as const).map(s => (
          <div key={s} className={`h-1 rounded-full transition-all ${step >= s ? 'bg-orange-500 w-8' : 'bg-white/10 w-4'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">あなたの名前は？</h2>
            <p className="text-sm text-white/40 mb-8">SoundFitで表示される名前を入力してください</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
              placeholder="ニックネームを入力..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-lg font-bold focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              className="mt-6 w-full py-4 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95"
            >
              次へ
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">好きなジャンルは？</h2>
            <p className="text-sm text-white/40 mb-6">複数選択OK</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {GENRE_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${genres.includes(g) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              disabled={genres.length === 0}
              onClick={() => setStep(3)}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95"
            >
              次へ ({genres.length}件選択中)
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">好きなアーティストは？</h2>
            <p className="text-sm text-white/40 mb-6">1人以上入力してください</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={artistInput}
                onChange={e => setArtistInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addArtist()}
                placeholder="アーティスト名・バンド名..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button onClick={addArtist} className="px-4 py-3 bg-orange-500 rounded-xl text-white">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-8 min-h-[40px]">
              {artists.map(a => (
                <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-sm text-white/80 font-medium">
                  {a}
                  <button onClick={() => setArtists(prev => prev.filter(x => x !== a))} className="text-white/40 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <button
              disabled={artists.length === 0}
              onClick={() => onComplete({ name: name.trim(), genres, artists })}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95"
            >
              SoundFitをはじめる ✦
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- SongSwipeCard -------------------------------------------------

function SongSwipeCard({ song, previewUrl, onSwipe }: {
  song: Song;
  previewUrl: string | null;
  onSwipe: (dir: 'left' | 'right' | 'up') => void;
  key?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.4, 1, 1, 1, 0.4]);
  const overlayRight = useTransform(x, [0, 120], ['rgba(234,88,12,0)', 'rgba(234,88,12,0.25)']);
  const overlayLeft = useTransform(x, [-120, 0], ['rgba(100,100,100,0.25)', 'rgba(100,100,100,0)']);
  const overlayUp = useTransform(y, [-120, 0], ['rgba(251,191,36,0.25)', 'rgba(251,191,36,0)']);

  const addLabel = useTransform(x, [40, 120], [0, 1]);
  const skipLabel = useTransform(x, [-120, -40], [1, 0]);
  const superLabel = useTransform(y, [-120, -40], [1, 0]);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [muted, setMuted] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // previewUrl が変わったら新しい Audio オブジェクトを作成して自動再生を試みる
  useEffect(() => {
    if (!previewUrl) return;
    const audio = new Audio(previewUrl);
    audio.volume = 0.7;
    audioRef.current = audio;
    setLoadingAudio(true);
    setProgress(0);

    const onTime = () => setProgress(audio.currentTime / (audio.duration || 30));
    const onEnded = () => setPlaying(false);
    const onCanPlay = () => setLoadingAudio(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('canplaythrough', onCanPlay);

    audio.play().then(() => setPlaying(true)).catch(() => { setPlaying(false); setLoadingAudio(false); });

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('canplaythrough', onCanPlay);
      audioRef.current = null;
    };
  }, [previewUrl]);

  // ミュート同期
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlay = (e: MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    audioRef.current?.pause();
    if (info.offset.y < -120) { onSwipe('up'); return; }
    if (info.offset.x > 120) { onSwipe('right'); return; }
    if (info.offset.x < -120) { onSwipe('left'); return; }
  };

  const releaseLabel = song.releaseMonth
    ? `${song.releaseYear}.${String(song.releaseMonth).padStart(2, '0')}`
    : `${song.releaseYear}`;

  return (
    <motion.div
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing p-5"
    >
      {/* Rhythm float animation when idle */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-full max-w-sm"
      >
        <div className="relative w-full h-[580px] bg-[#0c0c0e] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex flex-col">
          {/* Album cover - top 60% */}
          <div className="relative h-[60%] w-full overflow-hidden">
            {song.albumCover ? (
              <img src={song.albumCover} alt={song.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <AlbumPlaceholder genre={song.genre} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/10 to-transparent" />

            {/* Genre badge */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">{song.genre}</span>
            </div>

            {/* Play / Mute controls (album cover 右下) */}
            {previewUrl && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                <button
                  onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
                  className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-orange-500/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 text-white hover:bg-orange-500 transition-colors"
                >
                  {loadingAudio
                    ? <Loader2 size={16} className="animate-spin" />
                    : playing
                      ? <Pause size={16} fill="white" />
                      : <Play size={16} fill="white" />
                  }
                </button>
              </div>
            )}
          </div>

          {/* Song info - bottom 40% */}
          <div className="flex-1 px-6 py-5 flex flex-col justify-center gap-1">
            <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest">{releaseLabel}</p>
            <h2 className="text-2xl font-black text-white italic tracking-tight leading-tight line-clamp-2">{song.title}</h2>
            <p className="text-sm text-white/60 font-medium mt-0.5">{song.artist}</p>

            {/* Progress bar (previewUrl あり時のみ) */}
            {previewUrl ? (
              <div className="mt-3">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-500 rounded-full origin-left"
                    style={{ scaleX: progress }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/20 font-mono">
                    {Math.floor(progress * 30)}s
                  </span>
                  <span className="text-[9px] text-orange-500/60 font-mono font-black">▶ Deezer 30s preview</span>
                </div>
              </div>
            ) : (
              /* Swipe hint（preview なし時） */
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <X size={14} />
                  <span className="text-[10px] font-bold uppercase">スキップ</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-500/60">
                  <Heart size={14} />
                  <span className="text-[10px] font-bold uppercase">追加</span>
                </div>
                <div className="flex items-center gap-1.5 text-yellow-500/60">
                  <Star size={14} />
                  <span className="text-[10px] font-bold uppercase">スーパー</span>
                </div>
              </div>
            )}
          </div>

          {/* Overlay colors */}
          <motion.div style={{ backgroundColor: overlayRight }} className="absolute inset-0 pointer-events-none z-10" />
          <motion.div style={{ backgroundColor: overlayLeft }} className="absolute inset-0 pointer-events-none z-10" />
          <motion.div style={{ backgroundColor: overlayUp }} className="absolute inset-0 pointer-events-none z-10" />

          {/* Labels */}
          <motion.div style={{ opacity: addLabel }} className="absolute top-10 left-6 border-4 border-orange-500 text-orange-500 font-black px-5 py-2 rounded-xl -rotate-12 z-50 text-2xl uppercase tracking-widest bg-black shadow-xl">
            ♪ ADD
          </motion.div>
          <motion.div style={{ opacity: skipLabel }} className="absolute top-10 right-6 border-4 border-neutral-500 text-neutral-500 font-black px-5 py-2 rounded-xl rotate-12 z-50 text-2xl uppercase tracking-widest bg-black shadow-xl">
            SKIP
          </motion.div>
          <motion.div style={{ opacity: superLabel }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-yellow-400 text-yellow-400 font-black px-5 py-2 rounded-xl z-50 text-2xl uppercase tracking-widest bg-black shadow-xl whitespace-nowrap">
            ★ SUPER
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---- PlaylistTab ---------------------------------------------------

function PlaylistTab({ items }: { items: PlaylistItem[] }) {
  return (
    <div className="p-5 h-full flex flex-col overflow-y-auto pb-24 scrollbar-hide">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">TODAY'S</h2>
        <h2 className="text-3xl font-black text-orange-500 italic tracking-tighter uppercase">PLAYLIST</h2>
        <p className="text-xs text-white/30 font-mono mt-1">{items.length} TRACKS SAVED</p>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <ListMusic size={48} className="text-white/10" />
          <p className="text-white/30 text-sm">右または上にスワイプして<br />曲をプレイリストに追加しよう</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.song.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-3"
            >
              {/* Star marker */}
              <div className="w-5 flex-shrink-0 flex items-center justify-center">
                {item.isSuperLiked && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
              </div>

              {/* Album cover */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                {item.song.albumCover ? (
                  <img src={item.song.albumCover} alt={item.song.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <AlbumPlaceholder genre={item.song.genre} size="sm" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white italic truncate">{item.song.title}</p>
                <p className="text-xs text-white/40 truncate">{item.song.artist}</p>
              </div>

              {/* Spotify link */}
              {item.song.spotifyId && (
                <a
                  href={`https://open.spotify.com/track/${item.song.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-400 transition-colors flex-shrink-0"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- FriendsTab ----------------------------------------------------

function FriendsTab({ friends, onToggleFriend }: {
  friends: FriendAccount[];
  onToggleFriend: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<FriendAccount | null | 'not-found'>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendAccount | null>(null);

  const handleSearch = () => {
    const upper = query.trim().toUpperCase();
    const found = DEMO_FRIENDS.find(f => f.id === upper);
    setSearchResult(found ? { ...found, isAdded: friends.find(f2 => f2.id === found.id)?.isAdded ?? false } : 'not-found');
  };

  const addedFriends = friends.filter(f => f.isAdded);

  if (selectedFriend) {
    return <FriendDetailView friend={selectedFriend} onBack={() => setSelectedFriend(null)} onToggleFriend={onToggleFriend} />;
  }

  return (
    <div className="p-5 h-full flex flex-col overflow-y-auto pb-24 scrollbar-hide">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">FRIENDS</h2>
        <p className="text-xs text-white/30 font-mono mt-1">IDで友達を検索</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="ID を入力（例: RK9M2X）"
          maxLength={6}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-mono font-bold focus:outline-none focus:border-orange-500 transition-colors"
        />
        <button onClick={handleSearch} className="px-4 py-3 bg-orange-500 rounded-xl text-white hover:bg-orange-600 transition-colors">
          <Search size={18} />
        </button>
      </div>

      {/* Search result */}
      <AnimatePresence>
        {searchResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6">
            {searchResult === 'not-found' ? (
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center text-white/30 text-sm">
                ID「{query}」のアカウントが見つかりませんでした
              </div>
            ) : (
              <div className="bg-white/5 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3">
                <img src={searchResult.avatar} alt={searchResult.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <p className="font-black text-white italic">{searchResult.name}</p>
                  <div className="flex gap-1 mt-1">
                    {searchResult.topGenres.map(g => (
                      <span key={g} className="text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">{g}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { onToggleFriend(searchResult.id); setSearchResult(null); setQuery(''); }}
                  className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${
                    friends.find(f => f.id === searchResult.id)?.isAdded
                      ? 'bg-white/10 text-white/40'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {friends.find(f => f.id === searchResult.id)?.isAdded ? <Check size={16} /> : <Plus size={16} />}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend list */}
      {addedFriends.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <Users size={48} className="text-white/10" />
          <p className="text-white/30 text-sm">まだフレンドがいません<br />IDで検索して追加しよう</p>
          <p className="text-[10px] text-orange-500/40 font-mono">デモID: RK9M2X / LB4N7P / TW6H3Q / MZ8J5A / FX2C9D</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">フレンド一覧</p>
          {addedFriends.map(friend => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setSelectedFriend(friend)}
              className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 cursor-pointer hover:bg-white/10 transition-colors active:scale-[0.98]"
            >
              <div className="relative">
                <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                {friend.currentlyListening && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-[#0a0502] animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white italic">{friend.name}</p>
                {friend.currentlyListening ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <AudioLines size={10} className="text-orange-500 flex-shrink-0" />
                    <p className="text-xs text-orange-400/80 truncate">{friend.currentlyListening.title} - {friend.currentlyListening.artist}</p>
                  </div>
                ) : (
                  <p className="text-xs text-white/20 mt-0.5">オフライン</p>
                )}
              </div>
              <ChevronRight size={16} className="text-white/20" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- FriendDetailView ----------------------------------------------

function FriendDetailView({ friend, onBack, onToggleFriend }: {
  friend: FriendAccount;
  onBack: () => void;
  onToggleFriend: (id: string) => void;
}) {
  return (
    <div className="p-5 h-full flex flex-col overflow-y-auto pb-24 scrollbar-hide">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 text-sm mb-6 hover:text-white transition-colors">
        <ChevronRight size={16} className="rotate-180" /> 戻る
      </button>

      {/* Profile */}
      <div className="flex flex-col items-center mb-8">
        <img src={friend.avatar} alt={friend.name} className="w-24 h-24 rounded-full object-cover border-4 border-orange-500 mb-3" referrerPolicy="no-referrer" />
        <h3 className="text-2xl font-black text-white italic uppercase">{friend.name}</h3>
        <p className="text-xs text-white/30 font-mono mt-1">{friend.id}</p>

        {/* Add/Remove friend button - prominent */}
        <button
          onClick={() => onToggleFriend(friend.id)}
          className={`mt-4 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
            friend.isAdded
              ? 'bg-white/10 border border-white/20 text-white/40'
              : 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-xl shadow-orange-500/20'
          }`}
        >
          {friend.isAdded ? 'フレンド解除' : '＋ フレンドに追加'}
        </button>
      </div>

      {/* Currently listening */}
      {friend.currentlyListening && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <AudioLines size={20} className="text-orange-500 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-0.5">今聴いている</p>
            <p className="text-sm font-black text-white">{friend.currentlyListening.title}</p>
            <p className="text-xs text-white/50">{friend.currentlyListening.artist}</p>
          </div>
        </div>
      )}

      {/* Genres */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">好きなジャンル</p>
        <div className="flex flex-wrap gap-2">
          {friend.topGenres.map(g => (
            <span key={g} className="px-3 py-1.5 bg-white/10 rounded-full text-xs font-bold text-white/70">{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- ProfileTab ----------------------------------------------------

function ProfileTab({
  prefs, userId, spotifyToken, loadingSpotify, spotifyData, playlist, onSpotifyConnect, onSpotifyDisconnect,
}: {
  prefs: UserPreferences;
  userId: string;
  spotifyToken: string | null;
  loadingSpotify: boolean;
  spotifyData: { name: string; avatar: string; topTracks: { title: string; artist: string; albumCover: string }[]; currentlyListening?: { title: string; artist: string } } | null;
  playlist: PlaylistItem[];
  onSpotifyConnect: () => void;
  onSpotifyDisconnect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(userId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const displayName = spotifyData?.name ?? prefs.name;
  const displayAvatar = spotifyData?.avatar ?? '';
  const topTracks = spotifyData?.topTracks ?? [];
  const superLiked = playlist.filter(p => p.isSuperLiked).slice(0, 1)[0];

  return (
    <div className="p-5 pb-24 overflow-y-auto h-full scrollbar-hide">
      {/* Avatar + name */}
      <div className="flex flex-col items-center mb-8 mt-2">
        <div className="w-24 h-24 rounded-full border-4 border-orange-500 overflow-hidden mb-3 shadow-xl shadow-orange-500/20">
          {loadingSpotify ? (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-orange-500" />
            </div>
          ) : displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center">
              <User size={36} className="text-white" />
            </div>
          )}
        </div>
        <h3 className="text-2xl font-black text-white italic uppercase">{displayName}</h3>

        {/* User ID */}
        <button onClick={copyId} className="flex items-center gap-2 mt-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
          <span className="text-xs font-mono text-white/40">{userId}</span>
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-white/30" />}
        </button>
      </div>

      {/* Currently listening (Spotify) */}
      {spotifyData?.currentlyListening && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <AudioLines size={18} className="text-orange-500 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest">今聴いている</p>
            <p className="text-sm font-black text-white truncate">{spotifyData.currentlyListening.title}</p>
            <p className="text-xs text-white/40 truncate">{spotifyData.currentlyListening.artist}</p>
          </div>
        </div>
      )}

      {/* Recently obsessed (super-liked) */}
      {superLiked && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Star size={18} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] text-yellow-400 font-black uppercase tracking-widest mb-0.5">最近ハマっている曲</p>
            <p className="text-sm font-black text-white truncate">{superLiked.song.artist}</p>
            <p className="text-xs text-white/60 truncate">{superLiked.song.title}</p>
          </div>
        </div>
      )}

      {/* Top 5 this month */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-4">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">今月のトップ5</p>
        {topTracks.length > 0 ? (
          <div className="space-y-2.5">
            {topTracks.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-black text-white/20 w-4">{i + 1}</span>
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                  {t.albumCover ? (
                    <img src={t.albumCover} alt={t.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center"><Music size={12} className="text-white/30" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{t.title}</p>
                  <p className="text-[10px] text-white/30 truncate">{t.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : playlist.length > 0 ? (
          <div className="space-y-2.5">
            {playlist.slice(0, 5).map((item, i) => (
              <div key={item.song.id} className="flex items-center gap-3">
                <span className="text-xs font-black text-white/20 w-4">{i + 1}</span>
                {item.isSuperLiked && <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{item.song.title}</p>
                  <p className="text-[10px] text-white/30 truncate">{item.song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/20">曲をスワイプして保存しよう</p>
        )}
      </div>

      {/* Favorite genres */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-4">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">好きなジャンル</p>
        <div className="flex flex-wrap gap-2">
          {prefs.genres.map(g => (
            <span key={g} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold">{g}</span>
          ))}
        </div>
      </div>

      {/* Spotify connect */}
      <button
        onClick={spotifyToken ? onSpotifyDisconnect : onSpotifyConnect}
        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
          spotifyToken
            ? 'bg-green-500/10 border border-green-500/30 hover:bg-red-500/10 hover:border-red-500/30 group'
            : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }`}
      >
        <Sparkles size={18} className={spotifyToken ? 'text-green-500 group-hover:text-red-400' : 'text-white/40'} />
        <span className={`text-xs font-black uppercase tracking-widest ${spotifyToken ? 'text-green-500 group-hover:text-red-400' : 'text-white/40'}`}>
          {spotifyToken ? 'Spotify 連携済み（タップで解除）' : 'Connect Spotify'}
        </span>
      </button>
    </div>
  );
}

// ---- App (root) ----------------------------------------------------

type Tab = 'discover' | 'playlist' | 'friends' | 'profile';

export default function App() {
  const [splash, setSplash] = useState(true);
  const [prefs, setPrefs] = useState<UserPreferences | null>(() => lsGet<UserPreferences | null>('sf_prefs', null));
  const [userId] = useState(() => getOrCreateUserId());
  const [activeTab, setActiveTab] = useState<Tab>('discover');

  // Song queue
  const [songs, setSongs] = useState<Song[]>(() => lsGet<Song[]>(todayKey(), []));
  const [swipeIndex, setSwipeIndex] = useState<number>(() => lsGet<number>('sf_swipe_index', 0));
  const [disliked, setDisliked] = useState<string[]>(() => lsGet<string[]>('sf_disliked', []));
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => lsGet<PlaylistItem[]>('sf_playlist', []));
  const [loadingAI, setLoadingAI] = useState(false);

  // Friends
  const [friendIds, setFriendIds] = useState<string[]>(() => lsGet<string[]>('sf_friends', []));
  const friends: FriendAccount[] = DEMO_FRIENDS.map(f => ({ ...f, isAdded: friendIds.includes(f.id) }));

  // Spotify
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [spotifyData, setSpotifyData] = useState<{
    name: string;
    avatar: string;
    topTracks: { title: string; artist: string; albumCover: string }[];
    currentlyListening?: { title: string; artist: string };
  } | null>(null);

  const generatingRef = useRef(false);

  // Deezer プレビュー URL（現在のカード用）
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Spotify コールバック処理 + プロフィール取得
  useEffect(() => {
    const init = async () => {
      try {
        const token = (await handleCallback()) ?? getStoredToken();
        if (!token) return;
        setSpotifyToken(token);
        setLoadingSpotify(true);
        const data = await fetchMySpotifyProfile(token);
        setSpotifyData(data);
      } catch (e) { console.error('Spotify init error:', e); }
      finally { setLoadingSpotify(false); }
    };
    init();
  }, []);

  // オンボーディング完了時: AIで50曲生成してlocalStorageに保存する
  const handleOnboardingComplete = useCallback(async (newPrefs: UserPreferences) => {
    lsSet('sf_prefs', newPrefs);
    setPrefs(newPrefs);
    setLoadingAI(true);
    generatingRef.current = true;
    try {
      const generated = await selectDailySongs(newPrefs.genres, newPrefs.artists);
      // Spotifyトークンがあればアルバムカバーを補完する
      const token = getStoredToken();
      if (token && generated.length > 0) {
        try {
          const covers = await fetchAlbumCovers(generated, token);
          const enriched = generated.map(s => {
            const info = covers[`${s.title}|${s.artist}`];
            return info ? { ...s, albumCover: info.albumCover, spotifyId: info.spotifyId } : s;
          });
          lsSet(todayKey(), enriched);
          lsSet('sf_swipe_index', 0);
          setSongs(enriched);
        } catch {
          lsSet(todayKey(), generated);
          lsSet('sf_swipe_index', 0);
          setSongs(generated);
        }
      } else {
        lsSet(todayKey(), generated);
        lsSet('sf_swipe_index', 0);
        setSongs(generated);
      }
      setSwipeIndex(0);
    } catch (e) {
      console.error('Song generation error:', e);
    } finally {
      setLoadingAI(false);
      generatingRef.current = false;
    }
  }, []);

  // 既存の曲キューが空でプロフィールがある場合、起動時に再生成する
  useEffect(() => {
    if (prefs && songs.length === 0 && !loadingAI && !generatingRef.current) {
      handleOnboardingComplete(prefs);
    }
  }, [prefs, songs.length, loadingAI, handleOnboardingComplete]);

  // スワイプ処理
  const currentSong = songs[swipeIndex] ?? null;

  // 表示中の曲が変わったら Deezer プレビュー URL を取得する
  useEffect(() => {
    setPreviewUrl(null);
    if (!currentSong) return;
    fetchPreviewUrl(currentSong.title, currentSong.artist).then(setPreviewUrl);
  }, [currentSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwipe = (dir: 'left' | 'right' | 'up') => {
    if (!currentSong) return;
    const nextIndex = swipeIndex + 1;
    lsSet('sf_swipe_index', nextIndex);
    setSwipeIndex(nextIndex);

    if (dir === 'left') {
      const updated = [...disliked, currentSong.id];
      lsSet('sf_disliked', updated);
      setDisliked(updated);
    } else {
      const item: PlaylistItem = {
        song: { ...currentSong, isSuperLiked: dir === 'up' },
        addedAt: new Date().toISOString(),
        isSuperLiked: dir === 'up',
      };
      const updated = [...playlist, item];
      lsSet('sf_playlist', updated);
      setPlaylist(updated);
    }
  };

  // フレンド追加・解除
  const handleToggleFriend = (id: string) => {
    setFriendIds(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      lsSet('sf_friends', updated);
      return updated;
    });
  };

  // Spotify disconnect
  const handleSpotifyDisconnect = () => {
    clearToken();
    setSpotifyToken(null);
    setSpotifyData(null);
  };

  const playlistCount = playlist.length;

  return (
    <div className="h-dvh bg-[#0a0502] text-neutral-200 font-sans overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence>
        {splash && <SplashScreen onComplete={() => setSplash(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {!splash && !prefs && (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-50 px-5 pb-4 pt-[calc(1.25rem+var(--safe-top))] flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-tr from-orange-500 to-rose-600 rounded-lg flex items-center justify-center">
            <Music className="text-white" size={15} />
          </div>
          <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">SoundFit</h1>
        </div>
        <button className="relative p-1">
          <Bell size={20} className="opacity-40" />
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 relative z-10 max-w-lg mx-auto w-full min-h-0">

        {/* DISCOVER TAB */}
        {activeTab === 'discover' && (
          <div className="relative h-full flex items-center justify-center">
            {loadingAI ? (
              <div className="flex flex-col items-center gap-4 text-center px-8">
                <Loader2 size={40} className="animate-spin text-orange-500" />
                <p className="text-white/60 text-sm font-bold">AIが今日の50曲をセレクト中...</p>
                <p className="text-white/20 text-xs">少々お待ちください</p>
              </div>
            ) : currentSong ? (
              <AnimatePresence mode="popLayout">
                <SongSwipeCard key={currentSong.id} song={currentSong} previewUrl={previewUrl} onSwipe={handleSwipe} />
              </AnimatePresence>
            ) : prefs ? (
              <div className="flex flex-col items-center gap-4 text-center px-8">
                <Music size={48} className="text-orange-500/40" />
                <h3 className="text-2xl font-black text-white italic">今日の曲は全部チェックしました！</h3>
                <p className="text-sm text-white/30">明日また新しい50曲をセレクトします</p>
                <button
                  onClick={() => {
                    lsSet('sf_swipe_index', 0);
                    setSwipeIndex(0);
                  }}
                  className="mt-4 px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  最初から聴き直す
                </button>
              </div>
            ) : null}

            {/* Action buttons */}
            {currentSong && !loadingAI && (
              <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-5 z-40">
                <button
                  onClick={() => handleSwipe('left')}
                  className="w-14 h-14 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:border-white transition-all shadow-xl active:scale-90"
                >
                  <X size={24} />
                </button>
                <button
                  onClick={() => handleSwipe('up')}
                  className="w-14 h-14 bg-neutral-900/60 backdrop-blur-xl border border-yellow-500/30 rounded-full flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-xl active:scale-90"
                >
                  <Star size={22} fill="currentColor" />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  className="w-14 h-14 bg-neutral-900/60 backdrop-blur-xl border border-orange-500/30 rounded-full flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-xl active:scale-90"
                >
                  <Heart size={24} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* PLAYLIST TAB */}
        {activeTab === 'playlist' && <PlaylistTab items={playlist} />}

        {/* FRIENDS TAB */}
        {activeTab === 'friends' && <FriendsTab friends={friends} onToggleFriend={handleToggleFriend} />}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && prefs && (
          <ProfileTab
            prefs={prefs}
            userId={userId}
            spotifyToken={spotifyToken}
            loadingSpotify={loadingSpotify}
            spotifyData={spotifyData}
            playlist={playlist}
            onSpotifyConnect={loginWithSpotify}
            onSpotifyDisconnect={handleSpotifyDisconnect}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="relative z-50 bg-[#0c0f14]/80 backdrop-blur-2xl border-t border-white/5 p-3 pb-[calc(2rem+var(--safe-bottom))]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          {([
            { id: 'discover' as Tab, icon: Music, label: '発見', badge: undefined as number | undefined },
            { id: 'playlist' as Tab, icon: ListMusic, label: 'プレイリスト', badge: playlistCount as number | undefined },
            { id: 'friends' as Tab, icon: Users, label: 'フレンド', badge: undefined as number | undefined },
            { id: 'profile' as Tab, icon: User, label: 'マイページ', badge: undefined as number | undefined },
          ]).map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === id ? 'text-orange-500 scale-110' : 'text-neutral-500'}`}
            >
              <Icon size={22} className={activeTab === id ? 'animate-pulse' : ''} />
              <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
