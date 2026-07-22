import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnlineGameActions, OnlineGameState } from '@/lib/useOnlineGame';
import type { Difficulty } from '@/lib/useOnlineGame';
import { SelfPlayPanel } from '@/components/SelfPlayPanel';

interface LobbyPageProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
}

type View = 'menu' | 'vsplayer' | 'join' | 'vsai' | 'selfplay';

export function LobbyPage({ state, actions }: LobbyPageProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [view, setView] = useState<View>('menu');
  const [copied, setCopied] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleCreate = () => {
    if (!playerName.trim()) return;
    actions.createRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    actions.joinRoom(roomCode.trim(), playerName.trim());
  };

  const handleStartAi = () => {
    if (!playerName.trim()) return;
    actions.createAiRoom(playerName.trim(), difficulty);
  };

  const copyCode = () => {
    if (state.roomId) {
      navigator.clipboard.writeText(state.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Waiting screen
  if (state.status === 'waiting' && state.roomId) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8 max-w-sm w-full">
          <h1 className="font-serif text-5xl text-primary tracking-widest">HESS</h1>
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-2xl">
            <p className="text-muted-foreground text-sm uppercase tracking-widest">Your Room Code</p>
            <div className="font-mono text-5xl font-bold tracking-[0.3em] text-foreground">{state.roomId}</div>
            <button onClick={copyCode} className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-border" />
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
                ))}
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className="text-muted-foreground text-sm">Share the code. Waiting for your opponent…</p>
          </div>
          <button onClick={actions.disconnect} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">Cancel</button>
        </motion.div>
      </div>
    );
  }

  // Reconnecting screen
  if (state.status === 'reconnecting') {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 max-w-xs">
          <h1 className="font-serif text-4xl text-primary tracking-widest">HESS</h1>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
            ))}
          </div>
          <p className="text-muted-foreground text-sm">Rejoining your game…</p>
          {state.errorMsg && (
            <div className="space-y-3">
              <p className="text-sm text-red-400">{state.errorMsg}</p>
              <button onClick={actions.disconnect} className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline">Back to lobby</button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const nameInput = (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-widest text-muted-foreground">Your Name</label>
      <input
        type="text" value={playerName} onChange={e => setPlayerName(e.target.value)}
        placeholder="Enter your name" maxLength={20}
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
        onKeyDown={e => { if (e.key === 'Enter' && playerName.trim()) setView('vsplayer'); }}
      />
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="font-serif text-6xl text-primary tracking-widest">HESS</h1>
          <p className="text-muted-foreground text-sm tracking-wider">The War on the Board</p>
        </motion.div>

        {/* Rejoin banner */}
        <AnimatePresence>
          {state.savedSession && view === 'menu' && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-primary">Game in progress</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Room <span className="font-mono">{state.savedSession.roomId}</span> · Playing as {state.savedSession.myColor}
                  </p>
                </div>
                <button onClick={actions.dismissSession} className="text-muted-foreground/40 hover:text-muted-foreground text-lg leading-none">×</button>
              </div>
              <button onClick={actions.reconnectRoom}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-serif tracking-wider hover:opacity-90 transition-opacity">
                Rejoin Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ── Main Menu ── */}
          {view === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <button onClick={() => setView('vsplayer')}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg hover:opacity-90 transition-opacity text-left px-6 flex items-center justify-between">
                <span>vs Player</span>
                <span className="text-primary-foreground/50 text-base">⟶</span>
              </button>
              <button onClick={() => setView('vsai')}
                className="w-full py-4 rounded-xl border border-primary/40 text-primary font-serif tracking-widest text-lg hover:bg-primary/10 transition-colors text-left px-6 flex items-center justify-between">
                <span>vs AI <span className="text-primary/60 font-sans text-sm font-normal">(Hess)</span></span>
                <span className="text-primary/40 text-base">⟶</span>
              </button>
              <button onClick={() => setView('selfplay')}
                className="w-full py-4 rounded-xl border border-border text-muted-foreground font-serif tracking-widest text-lg hover:border-primary/30 hover:text-foreground transition-colors text-left px-6 flex items-center justify-between">
                <span>Hess vs Hess <span className="text-muted-foreground/40 font-sans text-xs font-normal">admin</span></span>
                <span className="text-muted-foreground/30 text-base">⟶</span>
              </button>
            </motion.div>
          )}

          {/* ── vs Player ── */}
          {view === 'vsplayer' && (
            <motion.div key="vsplayer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {nameInput}
              <button onClick={() => playerName.trim() && handleCreate()} disabled={!playerName.trim() || state.status === 'connecting'}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:opacity-90 transition-opacity">
                {state.status === 'connecting' ? 'Creating…' : 'Create Game'}
              </button>
              <button onClick={() => playerName.trim() && setView('join')} disabled={!playerName.trim()}
                className="w-full py-4 rounded-xl border border-border text-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:border-primary/50 transition-colors">
                Join Game
              </button>
              <button onClick={() => setView('menu')} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
            </motion.div>
          )}

          {/* ── Join ── */}
          {view === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Room Code</label>
                <input type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX" maxLength={6}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-foreground placeholder:text-muted-foreground/30 uppercase focus:outline-none focus:border-primary/60 transition-colors"
                  onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }} />
              </div>
              {state.errorMsg && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-red-400">
                  {state.errorMsg}
                </motion.p>
              )}
              <button onClick={handleJoin} disabled={state.status === 'connecting' || !roomCode.trim()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:opacity-90 transition-opacity">
                {state.status === 'connecting' ? 'Joining…' : 'Join Game'}
              </button>
              <button onClick={() => { setView('vsplayer'); setRoomCode(''); }} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
            </motion.div>
          )}

          {/* ── vs AI ── */}
          {view === 'vsai' && (
            <motion.div key="vsai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {nameInput}

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`py-3 rounded-xl border text-sm font-serif tracking-wider capitalize transition-colors ${
                        difficulty === d
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
                  {difficulty === 'easy' ? 'Moves quickly, plays loose' : difficulty === 'normal' ? 'Balanced challenge' : 'Thinks deeper — takes a moment'}
                </p>
              </div>

              {state.errorMsg && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-red-400">
                  {state.errorMsg}
                </motion.p>
              )}

              <button onClick={handleStartAi} disabled={!playerName.trim() || state.status === 'connecting'}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:opacity-90 transition-opacity">
                {state.status === 'connecting' ? 'Starting…' : 'Play vs Hess'}
              </button>
              <button onClick={() => setView('menu')} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
            </motion.div>
          )}

          {/* ── Hess vs Hess (Self-play admin) ── */}
          {view === 'selfplay' && (
            <SelfPlayPanel onBack={() => setView('menu')} />
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
