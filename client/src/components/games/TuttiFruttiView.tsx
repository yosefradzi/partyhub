import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { TuttiFruttiState, TuttiFruttiReviewItem } from '../../types';
import { sounds } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { CheckCircle, ArrowRight, Home as HomeIcon, Check, X, Flame } from 'lucide-react';

export const TuttiFruttiView: React.FC = () => {
  const { room, socket, isHost, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as TuttiFruttiState | null;

  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});
  const [spinLetter, setSpinLetter] = useState<string>('?');
  const votingCategoryIndex = gameState?.reviewCategoryIndex ?? 0;

  const [isCallingStopLocal, setIsCallingStopLocal] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  // Sync inputs with state when a new round starts
  useEffect(() => {
    setIsCallingStopLocal(false);
    setIsAdvancing(false);
    if (gameState?.phase === 'LETTER_SPIN') {
      setLocalInputs({});
      sounds.playLetterReveal();
      
      // Fast letter roulette animation
      let count = 0;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const interval = setInterval(() => {
        setSpinLetter(letters[Math.floor(Math.random() * letters.length)]);
        sounds.playTick();
        count++;
        if (count > 20) {
          clearInterval(interval);
          setSpinLetter(gameState.currentLetter);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [gameState?.phase, gameState?.currentRound, gameState?.currentLetter]);

  // Trigger fanfare and confetti on final podium
  useEffect(() => {
    if (gameState?.phase === 'FINAL_PODIUM') {
      sounds.playVictory();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }, [gameState?.phase]);

  // Trigger stop alarm when someone calls stop
  useEffect(() => {
    if (gameState?.phase === 'COUNTDOWN_STOP') {
      sounds.playStopAlarm();
    }
  }, [gameState?.phase]);

  if (!gameState || !room) return null;

  const letter = gameState.currentLetter;
  const categories = gameState.categories;

  const handleInputChange = (category: string, value: string) => {
    const updated = { ...localInputs, [category]: value };
    setLocalInputs(updated);

    if (socket) {
      socket.emit('tutifruti:input', { category, value });
    }
  };

  const handleCallStop = () => {
    if (gameState.phase !== 'PLAYING' || isCallingStopLocal) return;
    setIsCallingStopLocal(true);
    if (socket) {
      socket.emit('tutifruti:call_stop');
      sounds.playStopAlarm();
    }
  };

  const handleToggleValidation = (reviewKey: string) => {
    if (socket && gameState.phase === 'VOTING') {
      socket.emit('tutifruti:toggle_validation', { reviewKey });
      sounds.playClick();
    }
  };

  const handleSetCategoryIndex = (categoryIndex: number) => {
    if (socket && isHost && gameState.phase === 'VOTING') {
      socket.emit('tutifruti:set_review_category', { categoryIndex });
      sounds.playClick();
    }
  };

  const handleNextCategory = () => {
    if (socket && isHost && gameState.phase === 'VOTING' && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('tutifruti:next_category');
      sounds.playClick();
      setTimeout(() => setIsAdvancing(false), 500);
    }
  };

  const handleFinalizeVoting = () => {
    if (socket && isHost && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('tutifruti:finalize_voting');
      sounds.playSuccess();
    }
  };

  const handleNextRound = () => {
    if (socket && isHost && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('tutifruti:next_round');
      sounds.playClick();
    }
  };

  // --- 1. LETTER SPIN PHASE ---
  if (gameState.phase === 'LETTER_SPIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center">
        <span className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-2">
          Ronda {gameState.currentRound} de {gameState.totalRounds}
        </span>
        <h2 className="text-2xl font-black text-white mb-6">Girando la Ruleta de Letras...</h2>

        <div className="w-40 h-40 rounded-3xl bg-gradient-to-tr from-amber-500 via-pink-500 to-indigo-600 p-1.5 shadow-2xl animate-glow mb-6">
          <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
            <span className="text-8xl font-black text-white font-mono">{spinLetter}</span>
          </div>
        </div>

        <p className="text-sm text-slate-400 animate-pulse">
          ¡Prepárense para escribir rápido!
        </p>
      </div>
    );
  }

  // --- 2. PLAYING / COUNTDOWN_STOP PHASE ---
  if (gameState.phase === 'PLAYING' || gameState.phase === 'COUNTDOWN_STOP') {
    const isCountdown = gameState.phase === 'COUNTDOWN_STOP';
    const filledCount = categories.filter(c => (localInputs[c] || '').trim().length > 0).length;

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-28">
        {/* Sticky Top Info Bar */}
        <div className="sticky top-2 z-20 glass-panel rounded-3xl p-3 shadow-xl flex items-center justify-between border border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-mono font-black text-3xl flex items-center justify-center shadow-lg">
              {letter}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Letra de la Ronda
              </p>
              <p className="text-xs text-slate-300 font-medium">
                Ronda {gameState.currentRound}/{gameState.totalRounds} • {filledCount}/{categories.length} listos
              </p>
            </div>
          </div>

          {/* If STOP was called: Red glowing countdown */}
          {isCountdown && (
            <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-2xl animate-bounce">
              <span className="text-xs font-black uppercase">¡STOP!</span>
              <span className="text-xl font-mono font-black">{gameState.countdownSeconds}s</span>
            </div>
          )}
        </div>

        {/* Stop Announcement Banner */}
        {isCountdown && gameState.stopCaller && (
          <div className="w-full mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-2xl text-center text-red-200 text-xs font-bold animate-pulse">
            🚨 ¡{gameState.stopCaller.name} cantó STOP! ¡Termina lo que puedas!
          </div>
        )}

        {/* Inputs List */}
        <div className="flex flex-col gap-3 my-4">
          {categories.map((cat, idx) => {
            const val = localInputs[cat] || '';
            const norm = val.trim().toLowerCase();
            const startsWith = norm.startsWith(letter.toLowerCase());
            const isValidStart = norm.length > 0 && startsWith;

            return (
              <div key={idx} className="glass-card rounded-2xl p-3.5 border border-slate-800 focus-within:border-indigo-500 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-amber-400 font-mono font-black">{idx + 1}.</span> {cat}
                  </label>
                  {val.length > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isValidStart ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isValidStart ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {isValidStart ? 'Empieza bien' : `Debe iniciar con "${letter}"`}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={`Palabra con "${letter}"...`}
                  value={val}
                  onChange={(e) => handleInputChange(cat, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                />
              </div>
            );
          })}
        </div>

        {/* Bottom Action: Big STOP Button */}
        <div className="fixed inset-x-0 bottom-0 p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-30">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              disabled={isCountdown || isCallingStopLocal || filledCount === 0}
              onClick={handleCallStop}
              className={`w-full py-4 rounded-3xl font-black text-lg tracking-wider uppercase shadow-2xl flex items-center justify-center gap-3 transition-all ${
                isCountdown || isCallingStopLocal
                  ? 'bg-red-950 text-red-400 border border-red-800 opacity-80 cursor-not-allowed animate-pulse'
                  : filledCount === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-600 text-white shadow-red-600/40 animate-glow hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isCountdown || isCallingStopLocal ? (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <span>¡BASTA Cantado! ✓ ({gameState.countdownSeconds}s)</span>
                </>
              ) : (
                <>
                  <Flame className="w-6 h-6 fill-current animate-bounce" />
                  <span>¡BASTA PARA TODOS! (STOP 🛑)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. VOTING & REVIEW PHASE ---
  if (gameState.phase === 'VOTING') {
    const reviews = gameState.reviews || {};
    const currentCat = categories[votingCategoryIndex] || categories[0];

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-28">
        {/* Header */}
        <div className="glass-panel rounded-3xl p-4 shadow-xl mb-4 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                Fase de Votación y Revisión
              </span>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Letra: <span className="font-mono text-amber-300">{letter}</span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Puntajes:</span>
              <span className="text-[10px] text-emerald-400 font-bold block">+10 Única</span>
              <span className="text-[10px] text-amber-400 font-bold block">+5 Repetida</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          {categories.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={!isHost}
              onClick={() => handleSetCategoryIndex(i)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                votingCategoryIndex === i
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                  : 'bg-slate-900 text-slate-400 ' + (isHost ? 'hover:text-white cursor-pointer' : 'cursor-default opacity-60')
              }`}
            >
              {i + 1}. {c}
            </button>
          ))}
        </div>

        {/* Current Category Card */}
        <div className="glass-panel rounded-3xl p-4 shadow-xl flex-1 flex flex-col mb-4">
          <h3 className="text-base font-extrabold text-white mb-3 flex items-center justify-between">
            <span>{votingCategoryIndex + 1}. {currentCat}</span>
            <span className="text-xs text-slate-400 font-normal">Toca para anular/aprobar</span>
          </h3>

          <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
            {room.players.map((p) => {
              const reviewKey = `${p.id}_${votingCategoryIndex}`;
              const rev: TuttiFruttiReviewItem | undefined = reviews[reviewKey];
              const answerText = rev?.raw || '(Vacío)';
              const isValid = rev?.valid ?? false;
              const points = rev?.points ?? 0;
              const isDupe = rev?.isDuplicate ?? false;

              return (
                <div
                  key={p.id}
                  onClick={() => handleToggleValidation(reviewKey)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isValid
                      ? 'bg-slate-900/90 border-slate-700 hover:border-indigo-500'
                      : 'bg-red-950/20 border-red-900/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-2xl">{p.avatar}</span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-400 truncate">{p.name}</p>
                      <p className={`text-sm font-extrabold uppercase truncate ${isValid ? 'text-white' : 'text-red-400 line-through'}`}>
                        {answerText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isValid ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        isDupe ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        +{points} pts {isDupe ? '(Rep)' : '(Única)'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-400">
                        0 pts
                      </span>
                    )}
                    <button
                      type="button"
                      className={`p-1.5 rounded-xl ${isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {isValid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation / Host Confirm Action */}
        <div className="fixed inset-x-0 bottom-0 p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-30">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {isHost ? (
              votingCategoryIndex < categories.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextCategory}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  Siguiente Categoría ({votingCategoryIndex + 2}/{categories.length}) <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalizeVoting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirmar Puntos de la Ronda
                </button>
              )
            ) : (
              <div className="w-full py-3 px-4 text-center text-xs font-semibold text-slate-300 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Revisando categoría {votingCategoryIndex + 1} de {categories.length} (esperando al anfitrión...)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- 4. ROUND RESULTS & FINAL PODIUM ---
  const isPodium = gameState.phase === 'FINAL_PODIUM';
  const playersSorted = [...room.players].sort((a, b) => {
    const scoreA = gameState.cumulativeScores[a.id] || 0;
    const scoreB = gameState.cumulativeScores[b.id] || 0;
    return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      <div className="pt-4">
        <span className="text-4xl block mb-2">{isPodium ? '🏆' : '📊'}</span>
        <h2 className="text-3xl font-black text-white">
          {isPodium ? '¡Podio Final!' : `Resultados Ronda ${gameState.currentRound}`}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isPodium ? '¡Felicitaciones a los ganadores!' : 'Tabla general de posiciones'}
        </p>
      </div>

      {/* Leaderboard cards */}
      <div className="w-full flex flex-col gap-2.5 my-6">
        {playersSorted.map((p, idx) => {
          const totalScore = gameState.cumulativeScores[p.id] || 0;
          const roundScore = gameState.roundScores[p.id]?.total || 0;
          const isWinner = idx === 0;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-3xl border flex items-center justify-between transition-all ${
                isWinner
                  ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-indigo-500/20 border-amber-400 shadow-xl shadow-amber-500/10'
                  : 'glass-card border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-black font-mono text-lg text-slate-400 w-6">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>
                <span className="text-3xl">{p.avatar}</span>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-white">{p.name}</p>
                  {!isPodium && (
                    <p className="text-[11px] text-emerald-400 font-semibold">
                      +{roundScore} pts en esta ronda
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-amber-300">
                  {totalScore}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">puntos</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Controls */}
      <div className="w-full">
        {isHost ? (
          <div className="flex flex-col gap-2">
            {!isPodium ? (
              <button
                type="button"
                onClick={handleNextRound}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                Comenzar Ronda {gameState.currentRound + 1} <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={returnToLobby}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              Volver a la Sala
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 animate-pulse">
            Esperando al anfitrión para continuar...
          </p>
        )}
      </div>
    </div>
  );
};
