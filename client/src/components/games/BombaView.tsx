import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { BombaState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import { Home, Send } from 'lucide-react';

export const BombaView: React.FC = () => {
  const { room, socket, isHost, myPlayer, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as BombaState | null;

  const [inputWord, setInputWord] = useState<string>('');
  const [feedbackError, setFeedbackError] = useState<string>('');

  useEffect(() => {
    if (gameState?.phase === 'PLAYING') {
      sounds.playTick();
    } else if (gameState?.phase === 'EXPLODED') {
      sounds.playExplosion();
    }
  }, [gameState?.phase, gameState?.secondsRemaining]);

  if (!gameState || !room || !myPlayer) return null;

  const isMyTurn = gameState.isMyTurn;
  const activePlayer = room.players.find(p => p.id === gameState.activePlayerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim() || !isMyTurn) return;
    setFeedbackError('');

    if (socket) {
      socket.emit('bomba:submit_word', { word: inputWord.trim() }, (res: { success: boolean; reason?: string }) => {
        if (res.success) {
          setInputWord('');
          sounds.playSuccess();
        } else {
          setFeedbackError(res.reason || 'Palabra no válida');
          sounds.playError();
        }
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">💣</span>
        <h2 className="text-2xl font-black text-white">La Bomba de Palabras</h2>
        <p className="text-xs text-slate-400">
          ¡Di una palabra antes de que estalle la mecha!
        </p>
      </div>

      {/* Players Lives Grid */}
      <div className="flex gap-2 justify-center flex-wrap my-2">
        {room.players.map((p) => {
          const lives = gameState.lives[p.id] ?? 3;
          const isActive = p.id === gameState.activePlayerId;

          return (
            <div
              key={p.id}
              className={`p-2 rounded-2xl border transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                  : lives === 0
                  ? 'bg-slate-900/40 border-slate-800 opacity-40'
                  : 'glass-card border-slate-800'
              }`}
            >
              <span className="text-xl">{p.avatar}</span>
              <div className="text-left">
                <p className="text-xs font-bold text-white truncate max-w-[80px]">{p.name}</p>
                <div className="flex gap-0.5 text-xs text-red-500">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bomb Centerpiece */}
      {gameState.phase === 'PLAYING' && (
        <div className="my-auto flex flex-col items-center">
          {/* Bomb Graphic */}
          <div className="relative mb-4">
            <div className="text-8xl animate-bounce">
              💣
            </div>
            <div className="absolute -top-3 right-2 text-2xl animate-spin">
              💥
            </div>
          </div>

          {/* Seconds Ticking */}
          <div className="text-4xl font-black font-mono text-red-400 mb-2">
            {gameState.secondsRemaining}s
          </div>

          {/* Syllable Challenge */}
          <div className="glass-panel rounded-3xl p-5 border border-red-500/40 w-full mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Debe contener la sílaba:
            </p>
            <h3 className="text-5xl font-black font-mono text-amber-300 tracking-wider">
              {gameState.currentSyllable}
            </h3>
          </div>

          {/* Turn status */}
          <div className="w-full mb-4">
            {isMyTurn ? (
              <div className="p-3 bg-red-600/30 border border-red-500 rounded-2xl text-red-200 text-xs font-black animate-pulse">
                🔥 ¡TIENES LA BOMBA EN LA MANO! ¡ESCRIBE RÁPIDO!
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs font-semibold">
                La bomba la tiene: <span className="font-bold text-white">{activePlayer?.name}</span>
              </div>
            )}
          </div>

          {/* Word Input Form for active player */}
          {isMyTurn && (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
              {feedbackError && (
                <p className="text-xs text-red-400 font-bold">{feedbackError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Palabra con "${gameState.currentSyllable}"...`}
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  autoFocus
                  className="flex-1 bg-slate-900 border-2 border-red-500 rounded-2xl px-4 py-3 text-white text-base font-bold uppercase focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  Pasar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Exploded Phase */}
      {gameState.phase === 'EXPLODED' && (
        <div className="my-auto flex flex-col items-center">
          <div className="text-8xl animate-ping mb-4">💥</div>
          <h3 className="text-3xl font-black text-red-500 mb-2">¡BOOOOOOM!</h3>
          <p className="text-sm text-slate-300">
            La bomba le explotó a <span className="font-black text-white">{room.players.find(p => p.id === gameState.loserId)?.name}</span>
          </p>
        </div>
      )}

      {/* Game Over */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="my-auto flex flex-col items-center gap-4">
          <div className="text-7xl">🏆</div>
          <h3 className="text-3xl font-black text-white">¡Fin del Juego!</h3>
          <p className="text-base text-amber-300 font-bold">
            ¡Ganador: {room.players.find(p => p.id === gameState.winnerId)?.name || 'Nadie'}!
          </p>

          {isHost ? (
            <button
              type="button"
              onClick={returnToLobby}
              className="mt-4 w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Volver a la Sala
            </button>
          ) : (
            <p className="text-xs text-slate-400 animate-pulse mt-4">
              Esperando al anfitrión para volver a la sala...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
