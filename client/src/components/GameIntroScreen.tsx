import React, { useEffect } from 'react';
import { usePartySocket } from '../context/SocketContext';
import { ALL_GAMES } from '../constants';
import { sounds } from '../utils/soundEffects';
import { FastForward, CheckCircle2, BookOpen, Clock } from 'lucide-react';

export const GameIntroScreen: React.FC = () => {
  const { room, myPlayer, skipIntro } = usePartySocket();
  const intro = room?.introState;

  const currentGame = ALL_GAMES.find((g) => g.id === room?.selectedGame) || ALL_GAMES[0];
  const secondsRemaining = intro?.secondsRemaining ?? 10;
  const skips = intro?.skips ?? [];
  const totalPlayers = room?.players.length ?? 1;
  const hasSkipped = myPlayer ? skips.includes(myPlayer.id) : false;

  // Sound effect during countdown
  useEffect(() => {
    if (secondsRemaining <= 3 && secondsRemaining > 0) {
      sounds.playTick();
    }
  }, [secondsRemaining]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 py-8 max-w-lg mx-auto text-white select-none">
      {/* Top Banner: Game Name & Category */}
      <div className="w-full flex flex-col items-center text-center animate-fade-in">
        <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
          {currentGame.category}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-bounce">{currentGame.emoji}</span>
          <h1 className="text-3xl font-black tracking-tight text-white">{currentGame.name}</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{currentGame.tagline}</p>
      </div>

      {/* Center Countdown Pulse Indicator */}
      <div className="my-auto flex flex-col items-center gap-4 py-4">
        <div className="relative flex items-center justify-center">
          {/* Animated pulsing glow */}
          <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 blur-xl opacity-50 animate-pulse" />
          
          <div className="w-24 h-24 rounded-full border-4 border-indigo-400/80 bg-slate-900/90 shadow-2xl flex flex-col items-center justify-center z-10">
            <span className="font-mono text-4xl font-black text-amber-300 leading-none">
              {secondsRemaining}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" /> seg
            </span>
          </div>
        </div>

        {/* How to Play Rules Box */}
        <div className="w-full glass-panel rounded-2xl p-4 border border-slate-700/60 shadow-xl text-left mt-2">
          <div className="flex items-center gap-2 mb-3 text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>¿Cómo se juega?</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {currentGame.howToPlay && currentGame.howToPlay.length > 0 ? (
              currentGame.howToPlay.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="leading-snug pt-0.5">{rule}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{currentGame.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Skip Section */}
      <div className="w-full flex flex-col items-center gap-2">
        {!hasSkipped ? (
          <button
            onClick={skipIntro}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl shadow-xl flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
          >
            <FastForward className="w-5 h-5" />
            <span>Saltear contador</span>
            <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full font-mono text-indigo-200">
              {skips.length}/{totalPlayers}
            </span>
          </button>
        ) : (
          <div className="w-full py-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-emerald-300 font-bold flex items-center justify-center gap-2 text-sm shadow-md animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Listo ({skips.length}/{totalPlayers} saltearon)</span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center">
          {skips.length === totalPlayers
            ? '¡Comenzando partida!'
            : 'Si todos tocan saltear, arranca al instante.'}
        </p>
      </div>
    </div>
  );
};
