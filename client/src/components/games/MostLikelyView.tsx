import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { MostLikelyState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Flame, CheckCircle, ArrowRight, Home, PlusCircle } from 'lucide-react';

const SUGGESTIONS = [
  'se quede dormido en una fiesta',
  'se gaste el sueldo en una sola noche',
  'termine viviendo en la selva',
  'se tropiece en su propia boda',
  'se olvide el nombre de su pareja',
  'se haga viral en redes por algo vergonzoso',
  'le mienta al médico para no comer verduras'
];

export const MostLikelyView: React.FC = () => {
  const { room, socket, isHost, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as MostLikelyState | null;

  const [customPrompt, setCustomPrompt] = useState<string>('');

  useEffect(() => {
    if (gameState?.phase === 'FINAL_PODIUM') {
      sounds.playVictory();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }, [gameState?.phase]);

  if (!gameState || !room) return null;

  const handleSubmitPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || !socket) return;
    socket.emit('mostlikely:submit_prompt', { text: customPrompt.trim() });
    setCustomPrompt('');
    sounds.playSuccess();
  };

  const handleVote = (targetPlayerId: string) => {
    if (!socket || gameState.phase !== 'VOTING') return;
    socket.emit('mostlikely:vote', { targetPlayerId });
    sounds.playClick();
  };

  const handleNextQuestion = () => {
    if (socket && isHost) {
      socket.emit('mostlikely:next_question');
      sounds.playClick();
    }
  };

  // --- PHASE 1: SUBMIT PROMPTS (Written by participants!) ---
  if (gameState.phase === 'SUBMIT_PROMPTS') {
    return (
      <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
        <div className="pt-4">
          <span className="text-4xl block mb-2">✍️</span>
          <h2 className="text-2xl font-black text-white">Escribe una Pregunta</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cada jugador inventa una consigna divertida sobre el grupo.
          </p>
        </div>

        <div className="my-auto glass-panel rounded-3xl p-6 shadow-2xl border border-rose-500/30">
          <div className="text-xs font-bold text-rose-400 mb-3 flex items-center justify-center gap-1.5">
            Tiempo restante: {gameState.secondsRemaining}s
          </div>

          {!gameState.hasSubmittedPrompt ? (
            <form onSubmit={handleSubmitPrompt} className="flex flex-col gap-3">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  ¿Quién es más probable que...
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="...se quede encerrado en un baño?"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Suggestions chips */}
              <div className="text-left mt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  💡 O elige una idea rápida:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomPrompt(sug)}
                      className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-[11px] text-slate-300 text-left transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!customPrompt.trim()}
                className="mt-2 w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" /> Guardar mi Pregunta
              </button>
            </form>
          ) : (
            <div className="py-6 flex flex-col items-center gap-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
              <p className="text-sm font-bold text-white">¡Pregunta guardada!</p>
              <p className="text-xs text-slate-400">Esperando que todos tus amigos terminen...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- PHASE 2: VOTING FOR PLAYERS ---
  if (gameState.phase === 'VOTING') {
    const author = room.players.find(p => p.id === gameState.questionAuthorId);

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
        {/* Top Info */}
        <div className="glass-panel rounded-2xl p-3 flex items-center justify-between mb-3 border border-rose-500/30">
          <span className="text-xs font-bold text-rose-400">
            Pregunta {gameState.currentQuestionIndex + 1} de {gameState.totalQuestions}
          </span>
          <span className="font-mono text-base font-black text-amber-300">
            {gameState.secondsRemaining}s
          </span>
        </div>

        {/* Question Card */}
        <div className="glass-panel rounded-3xl p-5 mb-4 shadow-xl border border-rose-500/40">
          <h3 className="text-xl font-black text-white leading-snug mb-2">
            {gameState.currentQuestion}
          </h3>
          {author && (
            <span className="text-[11px] text-slate-400 font-semibold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              Escrita por: {author.name} {author.avatar}
            </span>
          )}
        </div>

        {/* Player Voting Grid */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            ¡Vota en secreto por un amigo!
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {room.players.map((p) => {
              const isSelected = gameState.myVote === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleVote(p.id)}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-rose-500/30 border-rose-400 scale-105 shadow-xl shadow-rose-500/20'
                      : 'glass-card border-slate-800 hover:border-slate-600 active:scale-95'
                  }`}
                >
                  <span className="text-4xl">{p.avatar}</span>
                  <span className="text-xs font-bold text-white truncate max-w-full">{p.name}</span>
                  {isSelected && (
                    <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black">
                      Tu Elección
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE 3: REVEAL RESULTS & WHO VOTED WHOM ---
  if (gameState.phase === 'REVEAL') {
    const winner = room.players.find(p => p.id === gameState.mostVotedPlayerId);
    const totalVotes = Object.keys(gameState.votes).length;

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
        {/* Question Header */}
        <div className="glass-panel rounded-2xl p-3 mb-3 border border-rose-500/30">
          <p className="text-xs font-extrabold text-white">"{gameState.currentQuestion}"</p>
        </div>

        {/* Most Voted Winner Showcase */}
        <div className="my-auto flex flex-col items-center">
          {winner ? (
            <div className="w-full glass-panel rounded-3xl p-6 border-2 border-rose-500 shadow-2xl flex flex-col items-center animate-glow mb-4">
              <span className="text-5xl mb-2">{winner.avatar}</span>
              <span className="text-[11px] uppercase tracking-widest font-black text-rose-400 flex items-center gap-1">
                <Flame className="w-4 h-4 fill-current" /> ¡El más votado por el grupo!
              </span>
              <h3 className="text-2xl font-black text-white mt-1">{winner.name}</h3>
              <p className="text-xs text-amber-300 font-bold mt-1">
                {gameState.voteCounts[winner.id] || 0} de {totalVotes} votos (+10 pts)
              </p>
            </div>
          ) : (
            <p className="text-slate-400 py-6">¡Hubo un empate o nadie fue votado!</p>
          )}

          {/* Who Voted Whom Accordion / List */}
          <div className="w-full glass-panel rounded-2xl p-4 text-left">
            <span className="text-xs font-bold text-slate-300 block mb-2">
              Quién votó a quién:
            </span>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto text-xs">
              {Object.entries(gameState.votes).map(([voterId, targetId]) => {
                const voter = room.players.find(p => p.id === voterId);
                const target = room.players.find(p => p.id === targetId);
                return (
                  <div key={voterId} className="flex items-center justify-between p-1.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <span>{voter?.avatar}</span> {voter?.name}
                    </span>
                    <span className="text-slate-500">votó a</span>
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <span>{target?.avatar}</span> {target?.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Host action */}
        {isHost ? (
          <button
            type="button"
            onClick={handleNextQuestion}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2"
          >
            Siguiente Pregunta <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <p className="text-xs text-slate-400 animate-pulse">Esperando al anfitrión...</p>
        )}
      </div>
    );
  }

  // --- FINAL PODIUM ---
  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      <div className="my-auto flex flex-col gap-3">
        <span className="text-6xl mb-1">🏆</span>
        <h3 className="text-3xl font-black text-white">¡Fin de ¿Quién es Más Probable?!</h3>
        <p className="text-xs text-slate-400">Los amigos que más votos y puntos acumularon</p>

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
    </div>
  );
};
