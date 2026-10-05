import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { HivemindState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Send, CheckCircle, ArrowRight, Home, Sparkles } from 'lucide-react';

export const HivemindView: React.FC = () => {
  const { room, socket, isHost, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as HivemindState | null;

  const [inputAnswer, setInputAnswer] = useState<string>('');
  const [isSubmittedLocal, setIsSubmittedLocal] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  useEffect(() => {
    if (gameState?.phase === 'THINKING') {
      setInputAnswer('');
      setIsSubmittedLocal(false);
      setIsAdvancing(false);
    } else if (gameState?.phase === 'FINAL_PODIUM') {
      sounds.playVictory();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }, [gameState?.phase, gameState?.currentRound]);

  if (!gameState || !room) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAnswer.trim() || !socket || isSubmittedLocal) return;
    setIsSubmittedLocal(true);
    socket.emit('hivemind:submit_answer', { answer: inputAnswer.trim() });
    sounds.playSuccess();
  };

  const handleNextRound = () => {
    if (socket && isHost && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('hivemind:next_round');
      sounds.playClick();
    }
  };

  const isSubmitted = Boolean(gameState.hasSubmitted || isSubmittedLocal);

  const sortedPlayers = [...room.players].sort((a, b) => {
    const sA = gameState.cumulativeScores[a.id] || 0;
    const sB = gameState.cumulativeScores[b.id] || 0;
    return sB - sA;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">👥</span>
        <h2 className="text-2xl font-black text-white">Mente Colectiva</h2>
        <p className="text-xs text-slate-400">
          Ronda {gameState.currentRound} de {gameState.totalRounds} • ¡Piensa igual que tus amigos!
        </p>
      </div>

      {/* Main Game Phase: THINKING */}
      {gameState.phase === 'THINKING' && (
        <div className="my-auto flex flex-col items-center gap-4">
          <div className="w-full glass-panel rounded-3xl p-6 shadow-2xl border border-teal-500/30">
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-teal-400">
              <span className="flex items-center gap-1"><Sparkles className="w-4 h-4" /> Pregunta de la ronda</span>
              <span className="font-mono text-base text-amber-300">{gameState.secondsRemaining}s</span>
            </div>

            <h3 className="text-2xl font-black text-white mb-6 leading-snug">
              "{gameState.currentQuestion}"
            </h3>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Tu respuesta común..."
                  value={inputAnswer}
                  onChange={(e) => setInputAnswer(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-center text-white font-bold text-base uppercase focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  type="submit"
                  disabled={!inputAnswer.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" /> Enviar Respuesta
                </button>
              </form>
            ) : (
              <div className="py-4 flex flex-col items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-extrabold">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>✓ Enviado</span>
                </div>
                <p className="text-xs text-slate-300 font-medium animate-pulse mt-1">
                  Esperando a los demás jugadores...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVEAL Phase: Clusters of Answers */}
      {gameState.phase === 'REVEAL' && (
        <div className="my-auto flex flex-col gap-3">
          <div className="glass-panel rounded-2xl p-3 border border-teal-500/30 mb-2">
            <p className="text-xs font-bold text-slate-400">Pregunta:</p>
            <p className="text-sm font-extrabold text-white">"{gameState.currentQuestion}"</p>
          </div>

          <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto">
            {(gameState.clusters || []).map((cluster, idx) => {
              const isMajority = cluster.points === 10;
              const isSecond = cluster.points === 5;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-3xl border-2 transition-all flex flex-col gap-2 ${
                    isMajority
                      ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border-emerald-400 shadow-xl'
                      : isSecond
                      ? 'bg-amber-500/20 border-amber-400'
                      : 'glass-card border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-white uppercase">{cluster.rawSample}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      isMajority ? 'bg-emerald-500 text-slate-950' : isSecond ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      +{cluster.points} pts ({cluster.count} {cluster.count === 1 ? 'coincidencia' : 'coincidencias'})
                    </span>
                  </div>

                  {/* Players in this cluster */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cluster.playerIds.map((pid) => {
                      const p = room.players.find(x => x.id === pid);
                      return (
                        <span key={pid} className="px-2 py-0.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1">
                          <span>{p?.avatar}</span> {p?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleNextRound}
              className="mt-3 w-full py-4 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-75 transition-all"
            >
              {isAdvancing ? 'Avanzando...' : 'Siguiente Ronda'} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <p className="text-xs text-slate-400 mt-2 animate-pulse">Esperando al anfitrión...</p>
          )}
        </div>
      )}

      {/* FINAL_PODIUM Phase */}
      {gameState.phase === 'FINAL_PODIUM' && (
        <div className="my-auto flex flex-col gap-3">
          <div className="text-6xl mb-1">🏆</div>
          <h3 className="text-3xl font-black text-white">¡Podio de Mente Colectiva!</h3>
          <p className="text-xs text-slate-400">Los jugadores que más en sintonía estuvieron</p>

          <div className="flex flex-col gap-2 my-4">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  idx === 0 ? 'bg-amber-500/20 border-amber-400' : 'glass-card border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-base">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-bold text-sm text-white">{p.name}</span>
                </div>
                <span className="font-mono font-black text-xl text-amber-300">
                  {gameState.cumulativeScores[p.id] || 0} pts
                </span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              type="button"
              onClick={returnToLobby}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Volver a la Sala
            </button>
          ) : (
            <p className="text-xs text-slate-400 animate-pulse">
              Esperando al anfitrión para volver a la sala...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
