import React from 'react';
import { usePartySocket } from '../context/SocketContext';

export const FloatingReactions: React.FC = () => {
  const { reactions } = usePartySocket();

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r, i) => (
        <div
          key={r.id || i}
          className="absolute bottom-20 float-emoji flex flex-col items-center select-none"
          style={{
            left: `${15 + (i * 23) % 70}%`,
            animationDelay: `${(i % 3) * 0.1}s`
          }}
        >
          <span className="text-4xl drop-shadow-md">{r.emoji}</span>
          <span className="text-xs bg-slate-900/80 px-2 py-0.5 rounded-full text-slate-300 font-semibold border border-white/10 mt-1">
            {r.playerName}
          </span>
        </div>
      ))}
    </div>
  );
};
