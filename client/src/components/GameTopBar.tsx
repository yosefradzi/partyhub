import React from 'react';
import { usePartySocket } from '../context/SocketContext';
import { ALL_GAMES } from '../constants';
import { Check, X } from 'lucide-react';

export const GameTopBar: React.FC = () => {
  const { room, myPlayer } = usePartySocket();

  if (!room || room.status !== 'PLAYING') return null;

  const currentGame = ALL_GAMES.find((g) => g.id === room.selectedGame);
  const completedIds = (room.gameState?.completedPlayerIds as string[]) || [];
  const totalPlayers = room.players.length;
  const readyCount = room.players.filter((p) => completedIds.includes(p.id)).length;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 shadow-md">
      <div className="max-w-xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2">
        {/* Left: Mini Game Icon & Code */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-base select-none">{currentGame?.emoji || '🎮'}</span>
          <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
            {room.code}
          </span>
        </div>

        {/* Center: Scrollable horizontal player status chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 max-w-[70%]">
          {room.players.map((player) => {
            const isDone = completedIds.includes(player.id);
            const isMe = myPlayer?.id === player.id;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all flex-shrink-0 border select-none ${
                  isDone
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
                } ${isMe ? 'ring-1 ring-indigo-400/50 font-bold' : ''}`}
                title={`${player.name}: ${isDone ? 'Terminó' : 'Pendiente'}`}
              >
                <span className="text-xs">{player.avatar}</span>
                <span className="max-w-[55px] truncate text-[11px]">
                  {isMe ? 'Tú' : player.name}
                </span>

                {/* Tic (✓) or Cruz (✕) */}
                {isDone ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Fraction ready */}
        <div className="flex-shrink-0 text-right">
          <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
            {readyCount}/{totalPlayers}
          </span>
        </div>
      </div>
    </header>
  );
};
