/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import {
  Music, Star, X, Heart, User, Users, ListMusic,
  Search, Plus, Check, AudioLines, Sparkles, Loader2,
  Copy, ChevronRight, ExternalLink, Bell, Pause, Play, Volume2, VolumeX, Disc3,
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

function formatTime(secs: number): string {
  const s = Math.floor(secs);
  return `0:${String(s).padStart(2, '0')}`;
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
    <div className={`bg-gradient-to-br ${gradient} w-full h-full flex items-center justify-center`}>
      <Disc3 size={size === 'sm' ? 18 : 56} className="text-white/20" />
    </div>
  );
}

// ---- イコライザーバー (再生中アニメーション) -------------------------

function EqBars({ playing }: { playing: boolean }) {
  const heights = [3, 5, 4, 7, 3, 6, 4, 5, 3];
  return (
    <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-orange-500"
          animate={
            playing
              ? { height: [`${h * 2}px`, `${h * 3.5}px`, `${h}px`, `${h * 3}px`, `${h * 2}px`] }
              : { height: '2px' }
          }
          transition={{
            duration: 0.55 + i * 0.07,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.04,
          }}
        />
      ))}
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
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.7 }}
      className="fixed inset-0 z-[200] bg-[#060404] flex flex-col items-center justify-center"
    >
      {/* Glow */}
      <div className="absolute w-72 h-72 bg-orange-600/20 blur-[100px] rounded-full" />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="relative w-28 h-28"
      >
        <div className="w-full h-full bg-gradient-to-tr from-orange-500 via-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(234,88,12,0.5)]">
          <Disc3 className="text-white" size={52} />
        </div>
        {/* Vinyl groove rings */}
        <div className="absolute inset-3 rounded-full border border-white/10" />
        <div className="absolute inset-6 rounded-full border border-white/10" />
        <div className="absolute inset-[36px] rounded-full border border-white/20" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-center"
      >
        <h1 className="text-[2.6rem] font-black tracking-tighter text-white italic uppercase leading-none">SoundFit</h1>
        <p className="text-[10px] text-orange-500/50 font-mono tracking-[0.3em] uppercase mt-2.5">Discover Your Sound</p>
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
    <div className="fixed inset-0 z-[150] bg-[#060404] flex flex-col items-center justify-center px-6 overflow-y-auto">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-700/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Step indicator */}
      <div className="flex gap-2 mb-12">
        {([1, 2, 3] as const).map(s => (
          <motion.div
            key={s}
            animate={{ width: step >= s ? 32 : 12, opacity: step >= s ? 1 : 0.3 }}
            className={`h-1 rounded-full ${step >= s ? 'bg-orange-500' : 'bg-white/20'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 48 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -48 }} className="w-full max-w-sm">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em] mb-3">Step 1 of 3</p>
            <h2 className="text-[2rem] font-black text-white italic uppercase leading-tight mb-2">あなたの<br />名前は？</h2>
            <p className="text-sm text-white/30 mb-8">SoundFitで表示されるニックネーム</p>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
              placeholder="ニックネームを入力..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-lg font-bold focus:outline-none focus:border-orange-500/80 focus:bg-white/8 transition-all"
            />
            <button
              disabled={!name.trim()} onClick={() => setStep(2)}
              className="mt-5 w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-20 transition-all active:scale-[0.98] shadow-xl shadow-orange-500/25"
            >
              次へ →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 48 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -48 }} className="w-full max-w-sm">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em] mb-3">Step 2 of 3</p>
            <h2 className="text-[2rem] font-black text-white italic uppercase leading-tight mb-2">好きなジャンルは？</h2>
            <p className="text-sm text-white/30 mb-6">複数選択OK</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {GENRE_OPTIONS.map(g => (
                <motion.button
                  key={g} whileTap={{ scale: 0.93 }}
                  onClick={() => toggleGenre(g)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${genres.includes(g)
                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/[0.04] border-white/10 text-white/50 hover:border-white/25'
                  }`}
                >
                  {g}
                </motion.button>
              ))}
            </div>
            <button
              disabled={genres.length === 0} onClick={() => setStep(3)}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-20 transition-all active:scale-[0.98] shadow-xl shadow-orange-500/25"
            >
              次へ → ({genres.length}件)
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 48 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -48 }} className="w-full max-w-sm">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em] mb-3">Step 3 of 3</p>
            <h2 className="text-[2rem] font-black text-white italic uppercase leading-tight mb-2">好きなアーティストは？</h2>
            <p className="text-sm text-white/30 mb-6">1人以上入力してください</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text" value={artistInput} onChange={e => setArtistInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addArtist()}
                placeholder="アーティスト名・バンド名..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm font-bold focus:outline-none focus:border-orange-500/80 transition-all"
              />
              <button onClick={addArtist} className="px-4 py-3.5 bg-orange-500 rounded-xl text-white hover:bg-orange-400 transition-colors active:scale-95">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-8 min-h-[44px]">
              {artists.map(a => (
                <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/10 rounded-full text-sm text-white/70 font-medium">
                  {a}
                  <button onClick={() => setArtists(prev => prev.filter(x => x !== a))} className="text-white/30 hover:text-white transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <button
              disabled={artists.length === 0}
              onClick={() => onComplete({ name: name.trim(), genres, artists })}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-20 transition-all active:scale-[0.98] shadow-xl shadow-orange-500/25"
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
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const opacity = useTransform(x, [-220, -100, 0, 100, 220], [0.3, 1, 1, 1, 0.3]);
  const overlayRight = useTransform(x, [0, 130], ['rgba(234,88,12,0)', 'rgba(234,88,12,0.3)']);
  const overlayLeft = useTransform(x, [-130, 0], ['rgba(80,80,80,0.3)', 'rgba(80,80,80,0)']);
  const overlayUp = useTransform(y, [-130, 0], ['rgba(234,179,8,0.28)', 'rgba(234,179,8,0)']);
  const addLabel = useTransform(x, [40, 130], [0, 1]);
  const skipLabel = useTransform(x, [-130, -40], [1, 0]);
  const superLabel = useTransform(y, [-130, -40], [1, 0]);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

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
      audio.pause(); audio.src = '';
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('canplaythrough', onCanPlay);
      audioRef.current = null;
    };
  }, [previewUrl]);

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
    : String(song.releaseYear);

  return (
    <motion.div
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing px-4 py-6"
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full max-w-sm"
      >
        {/* Card shell */}
        <div className="relative w-full h-[600px] rounded-[2.8rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.85)]">

          {/* Full-height album cover */}
          <div className="absolute inset-0">
            {song.albumCover
              ? <img src={song.albumCover} alt={song.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <AlbumPlaceholder genre={song.genre} />
            }
          </div>

          {/* Top vignette for badge readability */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />

          {/* Genre badge */}
          <div className="absolute top-5 left-5 bg-black/50 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/10">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400">{song.genre}</span>
          </div>

          {/* Bottom glass info panel — full-width, ~50% height */}
          <div className="absolute bottom-0 inset-x-0 h-[52%]">
            {/* Gradient layer */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 px-6 pb-6 pt-10">
              <p className="text-[10px] font-mono text-white/30 tracking-widest mb-1.5">{releaseLabel}</p>
              <h2 className="text-[1.65rem] font-black text-white italic tracking-tight leading-[1.1] line-clamp-2 mb-1.5">{song.title}</h2>
              <p className="text-[13px] text-white/45 font-medium mb-4 truncate">{song.artist}</p>

              {previewUrl ? (
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="relative h-[3px] bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>

                  {/* Controls row */}
                  <div className="flex items-center gap-3">
                    <EqBars playing={playing} />
                    <span className="flex-1 text-[10px] text-white/20 font-mono tabular-nums">
                      {formatTime(progress * 30)} / 0:30
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
                      className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-all"
                    >
                      {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-black shadow-xl shadow-black/40 hover:bg-orange-50 transition-all active:scale-90"
                    >
                      {loadingAudio
                        ? <Loader2 size={15} className="animate-spin" />
                        : playing ? <Pause size={15} fill="black" /> : <Play size={15} fill="black" className="translate-x-[1px]" />
                      }
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5 text-white/20">
                    <X size={13} /><span className="text-[10px] font-bold uppercase tracking-wider">スキップ</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-orange-500/50">
                    <Heart size={13} /><span className="text-[10px] font-bold uppercase tracking-wider">保存</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-yellow-500/50">
                    <Star size={13} /><span className="text-[10px] font-bold uppercase tracking-wider">スーパー</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Swipe color overlays */}
          <motion.div style={{ backgroundColor: overlayRight }} className="absolute inset-0 pointer-events-none" />
          <motion.div style={{ backgroundColor: overlayLeft }} className="absolute inset-0 pointer-events-none" />
          <motion.div style={{ backgroundColor: overlayUp }} className="absolute inset-0 pointer-events-none" />

          {/* Swipe labels */}
          <motion.div style={{ opacity: addLabel }}
            className="absolute top-7 left-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black px-5 py-2.5 rounded-2xl -rotate-[8deg] z-50 text-xl uppercase tracking-widest shadow-2xl">
            ♡ SAVE
          </motion.div>
          <motion.div style={{ opacity: skipLabel }}
            className="absolute top-7 right-5 bg-neutral-800/90 backdrop-blur-sm border border-white/10 text-white/70 font-black px-5 py-2.5 rounded-2xl rotate-[8deg] z-50 text-xl uppercase tracking-widest shadow-2xl">
            SKIP
          </motion.div>
          <motion.div style={{ opacity: superLabel }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black font-black px-6 py-3 rounded-2xl z-50 text-xl uppercase tracking-widest shadow-2xl whitespace-nowrap">
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
    <div className="h-full flex flex-col overflow-y-auto pb-24 scrollbar-hide">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 sticky top-0 bg-[#060404]/90 backdrop-blur-xl z-10 border-b border-white/[0.04]">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[2rem] font-black text-white italic tracking-tighter leading-none uppercase">Today's</h2>
            <h2 className="text-[2rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 italic tracking-tighter leading-none uppercase">Playlist</h2>
          </div>
          <div className="text-right mb-1">
            <p className="text-[10px] text-white/20 font-mono">{items.length} TRACKS</p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
          <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <ListMusic size={32} className="text-white/15" />
          </div>
          <div>
            <p className="text-white/40 font-bold mb-1">まだ何も保存されていません</p>
            <p className="text-white/20 text-sm">右または上スワイプで追加しよう</p>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-1.5">
          {items.map((item, i) => (
            <motion.div
              key={item.song.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] transition-colors border border-white/[0.04]"
            >
              {/* Rank / Star */}
              <div className="w-5 flex-shrink-0 text-center">
                {item.isSuperLiked
                  ? <Star size={14} className="text-yellow-400 fill-yellow-400 mx-auto" />
                  : <span className="text-[11px] font-black text-white/15">{i + 1}</span>
                }
              </div>

              {/* Album */}
              <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                {item.song.albumCover
                  ? <img src={item.song.albumCover} alt={item.song.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <AlbumPlaceholder genre={item.song.genre} size="sm" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-white italic truncate leading-tight">{item.song.title}</p>
                <p className="text-[11px] text-white/35 truncate mt-0.5">{item.song.artist}</p>
              </div>

              {/* Spotify */}
              {item.song.spotifyId && (
                <a
                  href={`https://open.spotify.com/track/${item.song.spotifyId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-white/20 hover:text-green-400 transition-colors"
                >
                  <ExternalLink size={14} />
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
    const freshFriend = friends.find(f => f.id === selectedFriend.id) ?? selectedFriend;
    return <FriendDetailView friend={freshFriend} onBack={() => setSelectedFriend(null)} onToggleFriend={onToggleFriend} />;
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto pb-24 scrollbar-hide">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 sticky top-0 bg-[#060404]/90 backdrop-blur-xl z-10 border-b border-white/[0.04]">
        <h2 className="text-[2rem] font-black text-white italic tracking-tighter uppercase leading-none">Friends</h2>
        <p className="text-[10px] text-white/20 font-mono mt-0.5">IDで友達を検索・追加</p>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ID を入力（例: RK9M2X）"
            maxLength={6}
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm font-mono font-bold focus:outline-none focus:border-orange-500/60 transition-all"
          />
          <button onClick={handleSearch} className="px-4 py-3.5 bg-orange-500 hover:bg-orange-400 rounded-xl text-white transition-colors active:scale-95">
            <Search size={18} />
          </button>
        </div>

        {/* Search result */}
        <AnimatePresence>
          {searchResult && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {searchResult === 'not-found' ? (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 text-center text-white/25 text-sm">
                  ID「{query}」のアカウントが見つかりませんでした
                </div>
              ) : (
                <div className="bg-orange-500/5 border border-orange-500/15 rounded-2xl p-4 flex items-center gap-3.5">
                  <img src={searchResult.avatar} alt={searchResult.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-orange-500/30" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white italic truncate">{searchResult.name}</p>
                    <div className="flex gap-1 mt-1">
                      {searchResult.topGenres.map(g => (
                        <span key={g} className="text-[9px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full font-bold">{g}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { onToggleFriend(searchResult.id); setSearchResult(null); setQuery(''); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 ${
                      friends.find(f => f.id === searchResult.id)?.isAdded
                        ? 'bg-white/10 text-white/30'
                        : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
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
          <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <Users size={24} className="text-white/15" />
            </div>
            <div>
              <p className="text-white/35 font-bold text-sm mb-1">まだフレンドがいません</p>
              <p className="text-white/20 text-xs">IDで検索して追加しよう</p>
              <p className="text-[10px] text-orange-500/30 font-mono mt-3">RK9M2X · LB4N7P · TW6H3Q · MZ8J5A · FX2C9D</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">フレンド ({addedFriends.length})</p>
            {addedFriends.map(friend => (
              <motion.button
                key={friend.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedFriend(friend)}
                className="w-full flex items-center gap-3.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.04] rounded-2xl p-3.5 transition-colors active:scale-[0.98]"
              >
                <div className="relative flex-shrink-0">
                  <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                  {friend.currentlyListening && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-[#060404] animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-black text-white italic truncate">{friend.name}</p>
                  {friend.currentlyListening ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <AudioLines size={10} className="text-orange-500 flex-shrink-0" />
                      <p className="text-xs text-orange-400/70 truncate">{friend.currentlyListening.title} — {friend.currentlyListening.artist}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/15 mt-0.5">オフライン</p>
                  )}
                </div>
                <ChevronRight size={15} className="text-white/15 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
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
    <div className="h-full flex flex-col overflow-y-auto pb-24 scrollbar-hide">
      {/* Hero */}
      <div className="relative px-5 pt-5 pb-8 flex flex-col items-center">
        {/* Blurred avatar bg */}
        <div className="absolute inset-0 overflow-hidden">
          <img src={friend.avatar} alt="" className="w-full h-full object-cover scale-110 blur-3xl opacity-20" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060404]/60 to-[#060404]" />
        </div>

        <button onClick={onBack} className="self-start flex items-center gap-1.5 text-white/35 text-sm hover:text-white transition-colors mb-6 relative z-10">
          <ChevronRight size={16} className="rotate-180" /> 戻る
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <img src={friend.avatar} alt={friend.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-orange-500/40 shadow-2xl mb-3" referrerPolicy="no-referrer" />
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{friend.name}</h3>
          <p className="text-xs text-white/30 font-mono mt-1">{friend.id}</p>

          <button
            onClick={() => onToggleFriend(friend.id)}
            className={`mt-4 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
              friend.isAdded
                ? 'bg-white/8 border border-white/15 text-white/30'
                : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/30'
            }`}
          >
            {friend.isAdded ? 'フレンド解除' : '＋ フレンドに追加'}
          </button>
        </div>
      </div>

      <div className="px-5 space-y-3">
        {friend.currentlyListening && (
          <div className="bg-orange-500/8 border border-orange-500/15 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-500/15 rounded-full flex items-center justify-center">
              <AudioLines size={18} className="text-orange-500 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest mb-0.5">今聴いている</p>
              <p className="text-sm font-black text-white truncate">{friend.currentlyListening.title}</p>
              <p className="text-xs text-white/40 truncate">{friend.currentlyListening.artist}</p>
            </div>
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl p-4">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">好きなジャンル</p>
          <div className="flex flex-wrap gap-2">
            {friend.topGenres.map(g => (
              <span key={g} className="px-3 py-1.5 bg-white/8 border border-white/10 rounded-full text-xs font-bold text-white/60">{g}</span>
            ))}
          </div>
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
  const superLiked = playlist.find(p => p.isSuperLiked);

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide">
      {/* Hero section */}
      <div className="relative px-5 pt-5 pb-8 flex flex-col items-center">
        {/* Blurred bg from avatar or genre color */}
        <div className="absolute inset-0 overflow-hidden">
          {displayAvatar
            ? <img src={displayAvatar} alt="" className="w-full h-full object-cover scale-150 blur-3xl opacity-25" referrerPolicy="no-referrer" />
            : <div className="w-full h-full bg-gradient-to-br from-orange-900/40 to-rose-900/30" />
          }
          <div className="absolute inset-0 bg-gradient-to-b from-[#060404]/40 to-[#060404]" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/15 shadow-2xl mb-3">
            {loadingSpotify
              ? <div className="w-full h-full bg-white/5 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
              : displayAvatar
                ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <div className="w-full h-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center"><User size={36} className="text-white" /></div>
            }
          </div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{displayName}</h3>
          <button onClick={copyId} className="flex items-center gap-2 mt-2 bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10 transition-colors">
            <span className="text-xs font-mono text-white/35">{userId}</span>
            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/25" />}
          </button>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-4 mt-5">
          {[
            { label: '保存', value: playlist.length },
            { label: 'ジャンル', value: prefs.genres.length },
            { label: 'スーパー', value: playlist.filter(p => p.isSuperLiked).length },
          ].map(s => (
            <div key={s.label} className="text-center px-4 py-2.5 bg-white/[0.05] border border-white/[0.07] rounded-2xl min-w-[60px]">
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3">
        {/* Currently listening */}
        {spotifyData?.currentlyListening && (
          <div className="bg-orange-500/8 border border-orange-500/15 rounded-2xl p-4 flex items-center gap-3.5">
            <AudioLines size={18} className="text-orange-500 animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest">今聴いている</p>
              <p className="text-sm font-black text-white truncate">{spotifyData.currentlyListening.title}</p>
              <p className="text-xs text-white/35 truncate">{spotifyData.currentlyListening.artist}</p>
            </div>
          </div>
        )}

        {/* Recently obsessed */}
        {superLiked && (
          <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-2xl p-4 flex items-center gap-3.5">
            <Star size={18} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-yellow-400 font-black uppercase tracking-widest mb-0.5">最近ハマっている</p>
              <p className="text-sm font-black text-white truncate">{superLiked.song.title}</p>
              <p className="text-xs text-white/35 truncate">{superLiked.song.artist}</p>
            </div>
          </div>
        )}

        {/* Top 5 */}
        <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl p-4">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">
            {topTracks.length > 0 ? '今月のトップ5 (Spotify)' : '今日のプレイリスト トップ5'}
          </p>
          {(topTracks.length > 0 ? topTracks.slice(0, 5).map((t, i) => ({ title: t.title, artist: t.artist, albumCover: t.albumCover, i, superLiked: false }))
            : playlist.slice(0, 5).map((p, i) => ({ title: p.song.title, artist: p.song.artist, albumCover: p.song.albumCover, i, superLiked: p.isSuperLiked }))
          ).length > 0 ? (
            <div className="space-y-3">
              {(topTracks.length > 0
                ? topTracks.slice(0, 5).map((t, i) => ({ title: t.title, artist: t.artist, albumCover: t.albumCover, i, isSuperLiked: false }))
                : playlist.slice(0, 5).map((p, i) => ({ title: p.song.title, artist: p.song.artist, albumCover: p.song.albumCover, i, isSuperLiked: p.isSuperLiked }))
              ).map(t => (
                <div key={t.i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-white/15 w-4 text-center">{t.i + 1}</span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                    {t.albumCover
                      ? <img src={t.albumCover} alt={t.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full bg-white/8 flex items-center justify-center"><Music size={12} className="text-white/20" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white italic truncate">{t.title}</p>
                    <p className="text-[10px] text-white/30 truncate">{t.artist}</p>
                  </div>
                  {t.isSuperLiked && <Star size={11} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/20">曲をスワイプして保存しよう</p>
          )}
        </div>

        {/* Genres */}
        <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl p-4">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">好きなジャンル</p>
          <div className="flex flex-wrap gap-2">
            {prefs.genres.map(g => (
              <span key={g} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/15 text-orange-400 rounded-full text-xs font-bold">{g}</span>
            ))}
          </div>
        </div>

        {/* Spotify connect */}
        <button
          onClick={spotifyToken ? onSpotifyDisconnect : onSpotifyConnect}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
            spotifyToken
              ? 'bg-green-500/8 border border-green-500/20 hover:border-red-500/20 hover:bg-red-500/8 group'
              : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07]'
          }`}
        >
          <Sparkles size={16} className={spotifyToken ? 'text-green-500 group-hover:text-red-400 transition-colors' : 'text-white/30'} />
          <span className={`text-xs font-black uppercase tracking-widest ${spotifyToken ? 'text-green-500 group-hover:text-red-400 transition-colors' : 'text-white/30'}`}>
            {spotifyToken ? 'Spotify 連携済み（タップで解除）' : 'Connect Spotify'}
          </span>
        </button>
      </div>
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

  const [songs, setSongs] = useState<Song[]>(() => lsGet<Song[]>(todayKey(), []));
  const [swipeIndex, setSwipeIndex] = useState<number>(() => lsGet<number>('sf_swipe_index', 0));
  const [aiError, setAiError] = useState(false);
  const [disliked, setDisliked] = useState<string[]>(() => lsGet<string[]>('sf_disliked', []));
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => lsGet<PlaylistItem[]>('sf_playlist', []));
  const [loadingAI, setLoadingAI] = useState(false);

  const [friendIds, setFriendIds] = useState<string[]>(() => lsGet<string[]>('sf_friends', []));
  const friends: FriendAccount[] = DEMO_FRIENDS.map(f => ({ ...f, isAdded: friendIds.includes(f.id) }));

  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [spotifyData, setSpotifyData] = useState<{
    name: string; avatar: string;
    topTracks: { title: string; artist: string; albumCover: string }[];
    currentlyListening?: { title: string; artist: string };
  } | null>(null);

  const generatingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleOnboardingComplete = useCallback(async (newPrefs: UserPreferences) => {
    lsSet('sf_prefs', newPrefs);
    setPrefs(newPrefs);
    setLoadingAI(true);
    generatingRef.current = true;
    try {
      const generated = await selectDailySongs(newPrefs.genres, newPrefs.artists);
      const token = getStoredToken();
      if (token && generated.length > 0) {
        try {
          const covers = await fetchAlbumCovers(generated, token);
          const enriched = generated.map(s => {
            const info = covers[`${s.title}|${s.artist}`];
            return info ? { ...s, albumCover: info.albumCover, spotifyId: info.spotifyId } : s;
          });
          lsSet(todayKey(), enriched); lsSet('sf_swipe_index', 0); setSongs(enriched);
        } catch {
          lsSet(todayKey(), generated); lsSet('sf_swipe_index', 0); setSongs(generated);
        }
      } else {
        lsSet(todayKey(), generated); lsSet('sf_swipe_index', 0); setSongs(generated);
      }
      setSwipeIndex(0);
    } catch (e) {
      console.error('Song generation error:', e);
      setAiError(true);
    }
    finally { setLoadingAI(false); generatingRef.current = false; }
  }, []);

  useEffect(() => {
    // aiError が true のときはリトライしない（無限ループ防止）
    if (prefs && songs.length === 0 && !loadingAI && !generatingRef.current && !aiError) {
      handleOnboardingComplete(prefs);
    }
  }, [prefs, songs.length, loadingAI, handleOnboardingComplete, aiError]);

  const currentSong = songs[swipeIndex] ?? null;

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
      lsSet('sf_disliked', updated); setDisliked(updated);
    } else {
      const item: PlaylistItem = {
        song: { ...currentSong, isSuperLiked: dir === 'up' },
        addedAt: new Date().toISOString(),
        isSuperLiked: dir === 'up',
      };
      const updated = [...playlist, item];
      lsSet('sf_playlist', updated); setPlaylist(updated);
    }
  };

  const handleToggleFriend = (id: string) => {
    setFriendIds(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      lsSet('sf_friends', updated);
      return updated;
    });
  };

  const handleSpotifyDisconnect = () => {
    clearToken(); setSpotifyToken(null); setSpotifyData(null);
  };

  const playlistCount = playlist.length;

  const tabs: { id: Tab; icon: typeof Music; label: string; badge?: number }[] = [
    { id: 'discover', icon: Music, label: '発見' },
    { id: 'playlist', icon: ListMusic, label: 'リスト', badge: playlistCount || undefined },
    { id: 'friends', icon: Users, label: 'フレンド' },
    { id: 'profile', icon: User, label: 'マイページ' },
  ];

  return (
    <div className="h-dvh bg-[#060404] text-neutral-200 font-sans overflow-hidden flex flex-col">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] right-[-5%] w-[55%] h-[55%] bg-orange-900/15 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-rose-900/10 blur-[130px] rounded-full" />
      </div>

      <AnimatePresence>
        {splash && <SplashScreen onComplete={() => setSplash(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {!splash && !prefs && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-50 px-5 pt-[calc(1rem+var(--safe-top))] pb-3 flex justify-between items-center bg-[#060404]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Disc3 className="text-white" size={16} />
          </div>
          <h1 className="text-[1.1rem] font-black tracking-tighter text-white uppercase italic">SoundFit</h1>
        </div>
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Bell size={16} className="text-white/30" />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 max-w-lg mx-auto w-full min-h-0 overflow-hidden">

        {/* DISCOVER */}
        {activeTab === 'discover' && (
          <div className="relative h-full flex items-center justify-center">
            {loadingAI ? (
              <div className="flex flex-col items-center gap-5 text-center px-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  <Disc3 size={44} className="text-orange-500/60" />
                </motion.div>
                <div>
                  <p className="text-white/60 text-sm font-black mb-1">AIが今日の50曲をセレクト中...</p>
                  <p className="text-white/20 text-xs">少々お待ちください</p>
                </div>
              </div>
            ) : currentSong ? (
              <AnimatePresence mode="popLayout">
                <SongSwipeCard key={currentSong.id} song={currentSong} previewUrl={previewUrl} onSwipe={handleSwipe} />
              </AnimatePresence>
            ) : aiError ? (
              <div className="flex flex-col items-center gap-5 text-center px-8">
                <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <Sparkles size={36} className="text-rose-400/60" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white italic mb-1">曲の取得に失敗しました</h3>
                  <p className="text-sm text-white/40">APIキーを確認してもう一度お試しください</p>
                </div>
                {prefs && (
                  <button
                    onClick={() => { setAiError(false); handleOnboardingComplete(prefs); }}
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-orange-500/25"
                  >
                    もう一度試す
                  </button>
                )}
              </div>
            ) : prefs ? (
              <div className="flex flex-col items-center gap-5 text-center px-8">
                <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <Disc3 size={36} className="text-orange-500/30" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white italic mb-1">今日の曲は全部チェック！</h3>
                  <p className="text-sm text-white/25">明日また新しい50曲が届きます</p>
                </div>
                <button
                  onClick={() => { lsSet('sf_swipe_index', 0); setSwipeIndex(0); }}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-orange-500/25"
                >
                  最初から聴き直す
                </button>
              </div>
            ) : null}

            {/* Action buttons */}
            {currentSong && !loadingAI && (
              <div className="absolute bottom-8 inset-x-0 flex justify-center items-center gap-4 z-40">
                {/* Skip */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSwipe('left')}
                  className="w-13 h-13 w-[52px] h-[52px] bg-white/[0.07] backdrop-blur-xl border border-white/[0.1] rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-xl"
                >
                  <X size={22} />
                </motion.button>

                {/* Add — main CTA */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSwipe('right')}
                  className="w-[68px] h-[68px] bg-gradient-to-br from-orange-500 to-rose-500 rounded-full flex flex-col items-center justify-center text-white shadow-2xl shadow-orange-500/40 hover:shadow-orange-500/60 transition-all"
                >
                  <Heart size={22} fill="white" />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">SAVE</span>
                </motion.button>

                {/* Super */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSwipe('up')}
                  className="w-[52px] h-[52px] bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/25 rounded-full flex items-center justify-center text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all shadow-xl"
                >
                  <Star size={20} fill="currentColor" />
                </motion.button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'playlist' && <PlaylistTab items={playlist} />}
        {activeTab === 'friends' && <FriendsTab friends={friends} onToggleFriend={handleToggleFriend} />}
        {activeTab === 'profile' && prefs && (
          <ProfileTab
            prefs={prefs} userId={userId} spotifyToken={spotifyToken}
            loadingSpotify={loadingSpotify} spotifyData={spotifyData} playlist={playlist}
            onSpotifyConnect={loginWithSpotify} onSpotifyDisconnect={handleSpotifyDisconnect}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="relative z-50 bg-black/70 backdrop-blur-3xl border-t border-white/[0.05] px-4 pt-2.5 pb-[calc(1.25rem+var(--safe-bottom))]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          {tabs.map(({ id, icon: Icon, label, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="relative flex flex-col items-center gap-1 px-3 py-1"
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${active ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : 'bg-transparent'}`}>
                  <Icon size={19} className={active ? 'text-white' : 'text-neutral-600'} />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md">
                      {badge > 99 ? '99' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide transition-all ${active ? 'text-orange-400' : 'text-transparent'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
