import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnlineGameActions, OnlineGameState } from '@/lib/useOnlineGame';

interface LobbyPageProps {
  state: OnlineGameState;
  actions: OnlineGameActions;
}

export function LobbyPage({ state, actions }: LobbyPageProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu');
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    actions.createRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    actions.joinRoom(roomCode.trim(), playerName.trim());
  };

  const copyCode = () => {
    if (state.roomId) {
      navigator.clipboard.writeText(state.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (state.status === 'waiting' && state.roomId) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8 max-w-sm w-full"
        >
          <h1 className="font-serif text-5xl text-primary tracking-widest">HESS</h1>
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-2xl">
            <p className="text-muted-foreground text-sm uppercase tracking-widest">Your Room Code</p>
            <div className="font-mono text-5xl font-bold tracking-[0.3em] text-foreground">
              {state.roomId}
            </div>
            <button
              onClick={copyCode}
              className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-border" />
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                  />
                ))}
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className="text-muted-foreground text-sm">
              Share the code. Waiting for your opponent...
            </p>
          </div>
          <button
            onClick={actions.disconnect}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="font-serif text-6xl text-primary tracking-widest">HESS</h1>
          <p className="text-muted-foreground text-sm tracking-wider">The War on the Board</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors"
                  onKeyDown={e => { if (e.key === 'Enter' && playerName.trim()) setView('create'); }}
                />
              </div>
              <button
                onClick={() => playerName.trim() && setView('create')}
                disabled={!playerName.trim()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Create Game
              </button>
              <button
                onClick={() => playerName.trim() && setView('join')}
                disabled={!playerName.trim()}
                className="w-full py-4 rounded-xl border border-border text-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:border-primary/50 transition-colors"
              >
                Join Game
              </button>
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-muted-foreground">
                Playing as <span className="text-foreground font-semibold">{playerName}</span> · You'll be <span className="text-primary font-semibold">White</span>
              </p>
              <button
                onClick={handleCreate}
                disabled={state.status === 'connecting'}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {state.status === 'connecting' ? 'Creating...' : 'Create Room'}
              </button>
              <button
                onClick={() => setView('menu')}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {view === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-foreground placeholder:text-muted-foreground/30 uppercase focus:outline-none focus:border-primary/60 transition-colors"
                  onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                />
              </div>
              {state.errorMsg && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-red-400"
                >
                  {state.errorMsg}
                </motion.p>
              )}
              <button
                onClick={handleJoin}
                disabled={state.status === 'connecting' || !roomCode.trim()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {state.status === 'connecting' ? 'Joining...' : 'Join Game'}
              </button>
              <button
                onClick={() => { setView('menu'); setRoomCode(''); }}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
