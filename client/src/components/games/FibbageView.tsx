import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { FibbageState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { ArrowRight, Home, CheckCircle } from 'lucide-react';

export const FibbageView: React.FC = () => {
  const { room, socket, isHost, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as FibbageState | null;

  const [bluffInput, setBluffInput] = useState<string>('');
  const [isSubmittedBluffLocal, setIsSubmittedBluffLocal] = useState<boolean>(false);
  const [votedChoiceIdLocal, setVotedChoiceIdLocal] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  useEffect(() => {
    if (gameState?.phase === 'BLUFFING') {
      setBluffInput('');
      setIsSubmittedBluffLocal(false);
      setVotedChoiceIdLocal(null);
      setIsAdvancing(false);
    } else if (gameState?.phase === 'CHOOSING') {
      setVotedChoiceIdLocal(null);
      setIsAdvancing(false);
    } else if (gameState?.phase === 'FINAL_PODIUM') {
      sounds.playVictory();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }, [gameState?.phase, gameState?.currentRound]);

  if (!gameState || !room) return null;

  const handleSubmitBluff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bluffInput.trim() || !socket || isSubmittedBluffLocal) return;
    setIsSubmittedBluffLocal(true);
    socket.emit('fibbage:submit_bluff', { bluffText: bluffInput.trim() });
    sounds.playSuccess();
  };

  const handleVoteChoice = (choiceId: string) => {
    if (!socket || gameState.phase !== 'CHOOSING' || votedChoiceIdLocal || gameState.hasVoted) return;
    setVotedChoiceIdLocal(choiceId);
    socket.emit('fibbage:vote_choice', { choiceId });
    sounds.playClick();
  };

  const handleNextRound = () => {
    if (socket && isHost && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('fibbage:next_round');
      sounds.playClick();
    }
  };

  const isSubmittedBluff = Boolean(gameState.hasSubmittedBluff || isSubmittedBluffLocal);
  const currentVoteId = votedChoiceIdLocal || gameState.myVote;
  const hasVotedAny = Boolean(gameState.hasVoted || votedChoiceIdLocal);

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">🎭</span>
        <h2 className="text-2xl font-black text-white">Cazador de Mentiras</h2>
        <p className="text-xs text-slate-400">
          Ronda {gameState.currentRound} de {gameState.totalRounds} • Categoría: <span className="font-bold text-violet-300">{gameState.category}</span>
        </p>
      </div>

      {/* PHASE 1: INVENTING BLUFFS */}
      {gameState.phase === 'BLUFFING' && (
        <div className="my-auto flex flex-col items-center gap-4">
          <div className="w-full glass-panel rounded-3xl p-6 shadow-2xl border border-violet-500/30">
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-violet-400">
              <span>Inventa tu engaño</span>
              <span className="font-mono text-base text-amber-300">{gameState.secondsRemaining}s</span>
            </div>

            <h3 className="text-xl font-black text-white mb-6 leading-relaxed">
              "{gameState.question}"
            </h3>

            {!isSubmittedBluff ? (
              <form onSubmit={handleSubmitBluff} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Escribe una mentira creíble..."
                  value={bluffInput}
                  onChange={(e) => setBluffInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-center text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <button
                  type="submit"
                  disabled={!bluffInput.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                >
                  ¡Enviar mi Mentira!
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

      {/* PHASE 2: CHOOSING THE TRUTH */}
      {gameState.phase === 'CHOOSING' && (
        <div className="my-auto flex flex-col gap-3">
          <div className="glass-panel rounded-2xl p-3 border border-violet-500/30 mb-2">
            <span className="text-[10px] uppercase font-bold text-violet-400 block">¿Cuál es la verdad?</span>
            <p className="text-sm font-extrabold text-white">"{gameState.question}"</p>
          </div>

          <div className="flex flex-col gap-2">
            {(gameState.choices || []).map((c) => {
              const isMine = c.isMine;
              const isSelected = currentVoteId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isMine || hasVotedAny}
                  onClick={() => handleVoteChoice(c.id)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-between ${
                    isMine
                      ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                      : isSelected
                      ? 'bg-violet-600/30 border-violet-400 text-white scale-102 shadow-lg shadow-violet-500/20'
                      : 'glass-card border-slate-800 text-slate-200 hover:border-slate-600 active:scale-98'
                  }`}
                >
                  <span>{c.text}</span>
                  {isMine && <span className="text-[10px] text-violet-400 font-semibold">(Tu mentira)</span>}
                  {isSelected && <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2 py-0.5 rounded-full">✓ Voto Enviado</span>}
                </button>
              );
            })}
          </div>

          {hasVotedAny && (
            <div className="mt-2 py-2 px-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center gap-2 animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-bold">
                Voto registrado • Esperando a los demás jugadores...
              </span>
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: REVEAL */}
      {gameState.phase === 'REVEAL' && (
        <div className="my-auto flex flex-col gap-3">
          <div className="glass-panel rounded-3xl p-5 border-2 border-emerald-500 shadow-2xl flex flex-col items-center animate-glow">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
              ¡La Verdad Real era!
            </span>
            <h3 className="text-2xl font-black text-white mt-1 mb-2">
              "{gameState.truth}"
            </h3>
            <span className="text-xs text-emerald-300 font-bold">
              +10 puntos para quienes la descubrieron
            </span>
          </div>

          {/* Breakdown of Choices and Victims */}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {(gameState.choices || []).map((c) => {
              const isTruth = c.isTruth;
              const author = room.players.find(p => p.id === c.authorId);
              // Find who voted for this
              const voters = Object.entries(gameState.votes)
                .filter(([_, choiceId]) => choiceId === c.id)
                .map(([voterId]) => room.players.find(p => p.id === voterId));

              return (
                <div
                  key={c.id}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 ${
                    isTruth
                      ? 'bg-emerald-950/40 border-emerald-500/50'
                      : 'glass-card border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black ${isTruth ? 'text-emerald-300' : 'text-white'}`}>
                      {c.text}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {isTruth ? 'VERDAD' : `Mentira de ${author?.name || 'la casa'}`}
                    </span>
                  </div>

                  {voters.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Engañó a:</span>
                      {voters.map(v => (
                        <span key={v?.id} className="px-1.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700">
                          {v?.avatar} {v?.name}
                        </span>
                      ))}
                      {!isTruth && author && (
                        <span className="text-amber-400 font-bold ml-auto">+{voters.length * 5} pts</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleNextRound}
              className="mt-2 w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-75 transition-all"
            >
              {isAdvancing ? 'Avanzando...' : 'Siguiente Ronda'} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <p className="text-xs text-slate-400 animate-pulse">Esperando al anfitrión...</p>
          )}
        </div>
      )}

      {/* FINAL PODIUM */}
      {gameState.phase === 'FINAL_PODIUM' && (
        <div className="my-auto flex flex-col gap-3">
          <div className="text-6xl mb-1">🏆</div>
          <h3 className="text-3xl font-black text-white">¡Fin del Cazador de Mentiras!</h3>
          <p className="text-xs text-slate-400">Los mejores detectores y mentirosos de la noche</p>

          <div className="flex flex-col gap-2 my-4">
            {[...room.players].sort((a,b) => (gameState.cumulativeScores[b.id]||0) - (gameState.cumulativeScores[a.id]||0)).map((p, idx) => (
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
