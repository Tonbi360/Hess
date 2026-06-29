import { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

interface SelfPlayPanelProps {
  onBack: () => void;
}

export function SelfPlayPanel({ onBack }: SelfPlayPanelProps) {
  const [password, setPassword] = useState('');
  const [numGames, setNumGames] = useState(50);
  const [depth, setDepth] = useState(2);
  const [phase, setPhase] = useState<'config' | 'running' | 'done' | 'error'>('config');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [resultMsg, setResultMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [bufferSize, setBufferSize] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => { socketRef.current?.disconnect(); };
  }, []);

  function getSocket(): Socket {
    if (socketRef.current?.connected) return socketRef.current;
    if (socketRef.current) { socketRef.current.removeAllListeners(); socketRef.current.disconnect(); }
    const base = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
    const s = io({ path: `${base}/api/socket.io/`, transports: ['websocket', 'polling'], reconnection: false });
    socketRef.current = s;

    s.on('self_play_progress', ({ completed, total }: { completed: number; total: number }) => {
      setProgress({ completed, total });
    });
    s.on('self_play_done', ({ bufferSize: bs, message }: { bufferSize: number; message: string }) => {
      setBufferSize(bs);
      setResultMsg(message);
      setPhase('done');
    });
    s.on('weights_reset', ({ message }: { message: string }) => {
      setResultMsg(message);
      setResetting(false);
    });
    s.on('ai_stats', ({ bufferSize: bs }: { bufferSize: number }) => {
      setBufferSize(bs);
    });
    s.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message);
      setPhase('error');
      setResetting(false);
    });
    return s;
  }

  const startSelfPlay = () => {
    if (!password.trim()) { setErrorMsg('Enter admin password.'); return; }
    setErrorMsg('');
    setPhase('running');
    setProgress({ completed: 0, total: numGames });
    const s = getSocket();
    s.emit('start_self_play', { password: password.trim(), numGames, depth });
  };

  const resetWeights = () => {
    if (!password.trim()) { setErrorMsg('Enter admin password.'); return; }
    setResetting(true);
    setResultMsg('');
    const s = getSocket();
    s.emit('reset_ai_weights', { password: password.trim() });
  };

  const fetchStats = () => {
    if (!password.trim()) { setErrorMsg('Enter admin password.'); return; }
    const s = getSocket();
    s.emit('get_ai_stats', { password: password.trim() });
  };

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <motion.div
      key="selfplay"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl text-primary tracking-widest">Hess vs Hess</h2>
        <p className="text-xs text-muted-foreground">AI self-play training admin panel</p>
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Admin Password</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" disabled={phase === 'running'}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Config */}
      {phase !== 'running' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Games</label>
              <span className="text-xs text-primary font-mono">{numGames}</span>
            </div>
            <input type="range" min={10} max={500} step={10} value={numGames}
              onChange={e => setNumGames(Number(e.target.value))}
              className="w-full accent-[var(--primary)]" />
            <div className="flex justify-between text-[10px] text-muted-foreground/40">
              <span>10</span><span>500</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Search Depth</label>
              <span className="text-xs text-primary font-mono">{depth}</span>
            </div>
            <input type="range" min={1} max={4} step={1} value={depth}
              onChange={e => setDepth(Number(e.target.value))}
              className="w-full accent-[var(--primary)]" />
            <div className="flex justify-between text-[10px] text-muted-foreground/40">
              <span>Fast (1)</span><span>Slow (4)</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center text-sm text-red-400">{errorMsg}</motion.p>
      )}

      {/* Progress */}
      {phase === 'running' && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Games completed</span>
              <span className="font-mono">{progress.completed} / {progress.total}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground/50 text-center">{pct}% — Hess is training…</p>
          </div>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center space-y-1">
          <p className="text-sm text-primary font-semibold">Training Complete</p>
          <p className="text-xs text-muted-foreground">{resultMsg}</p>
          {bufferSize !== null && (
            <p className="text-xs text-muted-foreground/50">Replay buffer: {bufferSize.toLocaleString()} positions</p>
          )}
        </motion.div>
      )}

      {/* Result message (for reset) */}
      {resultMsg && phase !== 'done' && (
        <p className="text-center text-xs text-primary">{resultMsg}</p>
      )}

      {/* Buffer size */}
      {bufferSize !== null && phase === 'config' && (
        <p className="text-center text-xs text-muted-foreground/50">
          Replay buffer: {bufferSize.toLocaleString()} positions
        </p>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {phase !== 'running' && (
          <button
            onClick={phase === 'done' ? () => { setPhase('config'); setResultMsg(''); } : startSelfPlay}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-serif tracking-widest text-lg hover:opacity-90 transition-opacity"
          >
            {phase === 'done' ? 'Run Again' : 'Start Self-Play'}
          </button>
        )}

        {phase !== 'running' && (
          <div className="flex gap-2">
            <button
              onClick={fetchStats}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              Check Stats
            </button>
            <button
              onClick={resetWeights}
              disabled={resetting}
              className="flex-1 py-2.5 rounded-xl border border-destructive/40 text-xs text-destructive/70 hover:text-destructive hover:border-destructive/70 transition-colors disabled:opacity-40"
            >
              {resetting ? 'Resetting…' : 'Reset Weights'}
            </button>
          </div>
        )}

        <button onClick={onBack} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
      </div>
    </motion.div>
  );
}
