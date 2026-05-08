/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { Heart, X, Music, User, MessageCircle, Info, Sparkles, AudioLines, Send, ChevronLeft, Bell, Settings } from 'lucide-react';
import { DUMMY_PROFILES, type MusicProfile, type Message } from './types';

// スプラッシュ画面コンポーネント
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] bg-[#0a0502] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-rose-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20"
        >
          <Music className="text-white" size={48} />
        </motion.div>
        
        {/* パーティクル的なエフェクト */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.5], x: (i - 2.5) * 40, y: -100 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-400"
          >
            <Sparkles size={16} />
          </motion.div>
        ))}
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="text-4xl font-black tracking-tighter text-white italic uppercase mb-2">SoundMatch</h1>
        <div className="flex items-center gap-2 text-orange-500/60 font-mono text-xs tracking-widest uppercase">
          <AudioLines size={14} />
          <span>Synchronizing Vibes...</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// チャット画面コンポーネント (デモ用)
function ChatRoom({ profile, onBack }: { profile: MusicProfile; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', senderId: profile.id, text: `はじめまして！${profile.favoriteArtists[0]}の最新アルバム、どう思いました？`, timestamp: '12:00' },
    { id: '2', senderId: 'me', text: '最高でしたね！特に3曲目のベースラインがたまらないです。', timestamp: '12:05' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[110] bg-[#0c0f14] flex flex-col"
    >
      <header className="pt-[calc(1rem+var(--safe-top))] px-4 pb-4 flex items-center gap-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          <div>
            <h3 className="font-bold text-white text-sm">{profile.name}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold uppercase">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>Matching now</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              m.senderId === 'me' 
                ? 'bg-orange-600 text-white rounded-tr-none' 
                : 'bg-white/5 text-white/90 border border-white/5 rounded-tl-none'
            }`}>
              {m.text}
              <p className={`text-[9px] mt-1 opacity-50 ${m.senderId === 'me' ? 'text-right' : 'text-left'}`}>
                {m.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 pb-10 bg-black/40 border-t border-white/5">
        <div className="flex gap-2">
          <input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="メッセージを入力..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button 
            onClick={handleSend}
            className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SwipeCard({ 
  profile, 
  onSwipe 
}: { 
  profile: MusicProfile; 
  onSwipe: (dir: 'left' | 'right') => void;
  key?: string;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.4, 1, 1, 1, 0.4]);
  const colorRight = useTransform(x, [0, 150], ['rgba(255,255,255,0)', 'rgba(234,88,12,0.3)']); // Orange for Jam
  const colorLeft = useTransform(x, [-150, 0], ['rgba(115,115,115,0.3)', 'rgba(255,255,255,0)']); // Gray for Next

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 150) {
      onSwipe('right');
    } else if (info.offset.x < -150) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing p-6"
    >
      <div className="relative w-full h-[620px] max-w-sm bg-[#0c0c0e] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex flex-col group">
        {/* Compatibility Badge */}
        <div className="absolute top-6 left-6 z-40">
          <div className="bg-orange-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
            <Sparkles size={10} className="animate-pulse" />
            <span className="text-[10px] font-black tracking-widest">{profile.compatibility ?? 0}% VIBE MATCH</span>
          </div>
        </div>

        {/* Swipe Overlays */}
        <motion.div style={{ backgroundColor: colorRight }} className="absolute inset-0 pointer-events-none z-10" />
        <motion.div style={{ backgroundColor: colorLeft }} className="absolute inset-0 pointer-events-none z-10" />

        {/* Profile Image with Vinyl Effect Overlay */}
        <div className="relative h-2/3 w-full overflow-hidden">
          <img 
            src={profile.avatar} 
            alt={profile.name}
            className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-transparent opacity-80" />
          
          {/* Listening Now Badge */}
          {profile.listeningNow && (
            <div className="absolute bottom-4 left-6 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 max-w-[85%]">
              <AudioLines size={14} className="text-orange-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase font-bold opacity-50 leading-none mb-1">Now Playing</p>
                <p className="text-xs font-medium text-white truncate leading-none">{profile.listeningNow}</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 bg-[#0c0c0e] p-6 flex flex-col pt-0 gap-3">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{profile.name}</h2>
            <span className="text-sm font-mono text-neutral-500">/{profile.age}</span>
          </div>
          
          {/* AI Insight Box */}
          <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1">
              <Sparkles size={12} className="text-orange-500/30" />
            </div>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1 italic">AI Insight</p>
            <p className="text-[11px] text-white/70 leading-relaxed italic line-clamp-2">
              "{profile.aiInsight}"
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                Favorites
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.favoriteArtists.slice(0, 3).map(artist => (
                  <span key={artist} className="text-[11px] font-medium text-white/80 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                    {artist}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Music size={14} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white truncate uppercase italic">{profile.topTrack}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Swipe Indicators */}
        <motion.div 
          style={{ opacity: useTransform(x, [50, 150], [0, 1]) }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-orange-500 text-orange-500 font-black px-8 py-3 rounded-xl transform -rotate-12 z-50 text-4xl uppercase tracking-widest bg-black shadow-2xl"
        >
          JAM
        </motion.div>
        <motion.div 
          style={{ opacity: useTransform(x, [-50, -150], [0, 1]) }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-neutral-500 text-neutral-500 font-black px-8 py-3 rounded-xl transform rotate-12 z-50 text-4xl uppercase tracking-widest bg-black shadow-2xl"
        >
          NEXT
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState(DUMMY_PROFILES);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'profile'>('discover');
  const [isMatch, setIsMatch] = useState<MusicProfile | null>(null);
  const [activeChat, setActiveChat] = useState<MusicProfile | null>(null);

  const currentProfile = useMemo(() => {
    return profiles.find(p => !history.includes(p.id));
  }, [profiles, history]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentProfile) return;

    if (direction === 'right') {
      // Simulate match logic
      if (Math.random() > 0.4) {
        setIsMatch(currentProfile);
      }
    }

    setHistory(prev => [...prev, currentProfile.id]);
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-neutral-200 font-sans overflow-hidden flex flex-col">
      <AnimatePresence>
        {loading && <SplashScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {activeChat && <ChatRoom profile={activeChat} onBack={() => setActiveChat(null)} />}
      </AnimatePresence>

      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-50 px-6 pb-6 pt-[calc(1.5rem+var(--safe-top))] flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-rose-600 rounded-lg flex items-center justify-center">
            <Music className="text-white" size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">SoundMatch</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative">
            <Bell size={22} className="opacity-60" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#0a0502]" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <Settings size={22} className="opacity-60" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-lg mx-auto w-full">
        {activeTab === 'discover' && (
          <div className="relative h-full flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              {currentProfile ? (
                <SwipeCard 
                  key={currentProfile.id}
                  profile={currentProfile} 
                  onSwipe={handleSwipe} 
                />
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 text-center px-8"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4 relative z-10">
                      <Music size={40} className="text-orange-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white italic tracking-tight">周りに音楽仲間がいません！</h3>
                  <p className="text-sm opacity-60 max-w-[200px]">検索範囲を広げるか、後でもう一度チェックしてください。</p>
                  <button 
                    onClick={() => setHistory([])}
                    className="mt-6 px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20"
                  >
                    リストをリセット
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Action Buttons */}
            {currentProfile && (
              <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-6 z-40">
                <button 
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:border-white transition-all shadow-xl active:scale-90"
                >
                  <X size={28} />
                </button>
                <button 
                  onClick={() => handleSwipe('right')}
                  className="w-16 h-16 bg-neutral-900/60 backdrop-blur-xl border border-orange-500/30 rounded-full flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-xl shadow-orange-500/10 active:scale-90"
                >
                  <Heart size={28} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="p-6 h-full flex flex-col">
            <header className="mb-8">
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1">CHANNELS</h2>
              <p className="text-xs font-mono text-orange-500 tracking-widest uppercase">Your Vibe Connections</p>
            </header>
            
            <div className="space-y-2 overflow-y-auto pb-20 scrollbar-hide">
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 px-2">New Jams</p>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {profiles.slice(2).map(p => (
                    <motion.div 
                      key={p.id} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveChat(p)}
                      className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-full p-1 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20">
                        <img src={p.avatar} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tight text-white/80">{p.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 px-2">Messages</p>
              {profiles.filter(p => [profiles[0].id, profiles[1].id].includes(p.id)).map((match, i) => (
                <motion.div 
                  key={match.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveChat(match)}
                  className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="relative">
                    <img src={match.avatar} className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 border-4 border-[#12141a] rounded-full" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-black text-white italic tracking-tight">{match.name}</p>
                      <span className="text-[9px] font-mono opacity-40">2h ago</span>
                    </div>
                    <p className="text-xs opacity-60 truncate font-medium">最近の{match.favoriteArtists[0]}のライブ見ました？</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-6 pb-24 overflow-y-auto h-full scrollbar-hide">
            <div className="flex flex-col items-center mb-10">
              <div className="relative mb-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-10px] rounded-full border border-dashed border-orange-500/30"
                />
                <div className="w-32 h-32 rounded-full border-4 border-orange-500 p-1 relative z-10 shadow-2xl shadow-orange-500/20">
                  <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full shadow-xl border-4 border-[#0a0502] z-20">
                  <Music size={16} className="text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1">Kaito</h3>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">Standard Rank</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-2xl font-black text-white">42</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest text-orange-500">Matches</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-2xl font-black text-white">1.2k</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest text-orange-500">Listeners</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem]">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] italic">Top Curations</p>
                  <Music size={14} className="opacity-20" />
                </div>
                <div className="space-y-3">
                  {['Radiohead', 'Tame Impala', 'Bonobo', 'Massive Attack'].map((a, i) => (
                    <div key={a} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono opacity-20">0{i+1}</span>
                        <span className="text-sm font-bold text-white/80 group-hover:text-orange-500 transition-colors uppercase italic">{a}</span>
                      </div>
                      <div className="w-8 h-[2px] bg-white/5 group-hover:bg-orange-500/50 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Followers Definition Section */}
              <div className="bg-orange-500/5 border border-orange-500/10 p-5 rounded-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-orange-500" />
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">リスナー（フォロワー）とは？</p>
                </div>
                <p className="text-[11px] leading-relaxed text-white/60 italic">
                  あなたのサウンドに共感したユーザーです。フォローされると、あなたの「今聴いている曲」や新しいプレイリストのアップデートが優先的に彼らのフィードに表示されます。
                </p>
              </div>
              
              <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all group">
                <AudioLines size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Connect Spotify</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="relative z-50 bg-[#0c0f14]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-[calc(2.5rem+var(--safe-bottom))]">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'discover' ? 'text-orange-500 scale-110' : 'text-neutral-500 font-medium'}`}
          >
            <Music size={22} className={activeTab === 'discover' ? 'animate-pulse' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">発見</span>
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'matches' ? 'text-orange-500 scale-110' : 'text-neutral-500 font-medium'}`}
          >
            <MessageCircle size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">ジャム</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-orange-500 scale-110' : 'text-neutral-500 font-medium'}`}
          >
            <User size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">マイページ</span>
          </button>
        </div>
      </nav>

      {/* Match Overlay */}
      <AnimatePresence>
        {isMatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
          >
            {/* バックグラウンドエフェクト */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
               <motion.div 
                 animate={{ 
                   scale: [1, 1.5, 1],
                   opacity: [0.1, 0.3, 0.1]
                 }}
                 transition={{ duration: 4, repeat: Infinity }}
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-orange-500 blur-[150px] rounded-full"
               />
            </div>

            <motion.div
              initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              className="text-orange-500 mb-10 relative"
            >
              <Heart size={140} fill="currentColor" className="drop-shadow-[0_0_40px_rgba(234,88,12,0.8)]" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Music size={40} className="text-white" />
              </motion.div>
            </motion.div>
            
            <h2 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-4 italic leading-none">JAM!</h2>
            <p className="text-xl mb-12 max-w-sm text-white/80 leading-relaxed">
              <span className="text-orange-500 font-bold">{isMatch.name}</span>さんも
              <span className="font-bold underline decoration-orange-500 decoration-4 underline-offset-4">{isMatch.genres[0]}</span>が好きです！
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs relative z-10">
              <button 
                onClick={() => {
                  setActiveChat(isMatch);
                  setIsMatch(null);
                }}
                className="w-full py-5 bg-orange-600 text-white rounded-full font-black uppercase tracking-[0.2em] hover:bg-orange-700 transition-all shadow-2xl shadow-orange-500/40 active:scale-95"
              >
                ジャムを開始
              </button>
              <button 
                onClick={() => setIsMatch(null)}
                className="w-full py-5 bg-white/5 text-white/50 rounded-full font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
              >
                検索を続ける
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
