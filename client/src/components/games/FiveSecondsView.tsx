import React, { useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { FiveSecondsState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Check, X, ArrowRight, Home, Play } from 'lucide-react';

export const FiveSecondsView: React.FC = () => {
  const { room, socket, isHost, myPlayer, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as FiveSecondsState | null;

  useEffect(() => {
    if (gameState?.phase === 'COUNTDOWN') {
      sounds.playTick();
    } else if (gameState?.phase === 'TURN_RESULT') {
      if (gameState.turnApproved) {
        sounds.playSuccess();
      } else {
        sounds.playError();
      }
    } else if (gameState?.phase === 'FINAL_PODIUM') {
      sounds.playVictory();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }, [gameState?.phase, gameState?.secondsRemaining, gameState?.turnApproved]);

  if (!gameState || !room) return null;

  const isMyTurn = gameState.isMyTurn;
  const activePlayer = room.players.find(p => p.id === gameState.activePlayerId);

  const handleStartCountdown = () => {
    if (!socket) return;
    socket.emit('fiveseconds:start_countdown');
    sounds.playLetterReveal();
  };

  const handleVote = (isApproved: boolean) => {
    if (!socket || gameState.phase !== 'VOTING') return;
    socket.emit('fiveseconds:vote', { isApproved });
    sounds.playClick();
  };

  const handleNextTurn = () => {
    if (!socket || !isHost) return;
    socket.emit('fiveseconds:next_turn');
    sounds.playClick();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">⏱️</span>
        <h2 className="text-2xl font-black text-white">5 Segundos</h2>
        <p className="text-xs text-slate-400">
          Ciclo {gameState.currentCycle} de {gameState.totalCycles} • ¡Responde en voz alta antes del cero!
        </p>
      </div>

      {/* Main Turn Card */}
      <div className="my-auto flex flex-col items-center gap-4">
        {/* Active Player Card */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-2xl">{activePlayer?.avatar}</span>
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">En el banquillo:</span>
            <span className="text-sm font-black text-white">{activePlayer?.name} {isMyTurn && '(¡Eres tú!)'}</span>
          </div>
        </div>

        {/* Prompt Card */}
        <div className="w-full glass-panel rounded-3xl p-6 shadow-2xl border border-orange-500/30">
          <h3 className="text-2xl font-black text-white leading-snug mb-6">
            "{gameState.currentPrompt}"
          </h3>

          {/* PHASE 1: GET READY */}
          {gameState.phase === 'GET_READY' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                {isMyTurn
                  ? '¡Prepárate! Al pulsar comenzar tendrás exactamente 5 segundos para decir las 3 cosas en voz alta.'
                  : `Esperando a que ${activePlayer?.name} esté listo para iniciar el cronómetro...`}
              </p>

              {(isMyTurn || isHost) && (
                <button
                  type="button"
                  onClick={handleStartCountdown}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/30 animate-pulse flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" /> ¡Iniciar 5 Segundos!
                </button>
              )}
            </div>
          )}

          {/* PHASE 2: COUNTDOWN */}
          {gameState.phase === 'COUNTDOWN' && (
            <div className="flex flex-col items-center">
              <div className="text-8xl font-black font-mono text-red-500 animate-ping my-2">
                {gameState.secondsRemaining}
              </div>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-2 animate-bounce">
                ¡DILO EN VOZ ALTA RÁPIDO!
              </p>
            </div>
          )}

          {/* PHASE 3: VOTING */}
          {gameState.phase === 'VOTING' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-300">
                {isMyTurn
                  ? '¿Dijiste las 3 cosas a tiempo? Tus amigos están votando...'
                  : `¿${activePlayer?.name} dijo las 3 cosas válidas en 5 segundos?`}
              </span>

              {!isMyTurn ? (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => handleVote(true)}
                    className={`py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
                      gameState.votes[myPlayer?.id || ''] === 'YES'
                        ? 'bg-emerald-500 text-slate-950 scale-105 shadow-lg'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
                    }`}
                  >
                    <Check className="w-5 h-5" /> Aprobado (+10)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(false)}
                    className={`py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
                      gameState.votes[myPlayer?.id || ''] === 'NO'
                        ? 'bg-red-500 text-white scale-105 shadow-lg'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40'
                    }`}
                  >
                    <X className="w-5 h-5" /> No llegó (0)
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-400 animate-pulse">
                  Esperando el veredicto del grupo...
                </div>
              )}
            </div>
          )}

          {/* PHASE 4: TURN RESULT */}
          {gameState.phase === 'TURN_RESULT' && (
            <div className="flex flex-col items-center gap-2">
              {gameState.turnApproved ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-1">
                    🎉
                  </div>
                  <h4 className="text-2xl font-black text-emerald-400">¡Reto Aprobado!</h4>
                  <p className="text-xs text-slate-300 font-semibold">+10 puntos para {activePlayer?.name}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-1">
                    ⏰
                  </div>
                  <h4 className="text-2xl font-black text-red-400">¡No alcanzó el tiempo!</h4>
                  <p className="text-xs text-slate-300 font-semibold">0 puntos en este turno</p>
                </>
              )}

              {isHost && (
                <button
                  type="button"
                  onClick={handleNextTurn}
                  className="mt-4 w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                  Siguiente Turno <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FINAL PODIUM */}
      {gameState.phase === 'FINAL_PODIUM' && (
        <div className="my-auto flex flex-col gap-3">
          <div className="text-6xl mb-1">🏆</div>
          <h3 className="text-3xl font-black text-white">¡Fin de 5 Segundos!</h3>
          <p className="text-xs text-slate-400">Puntajes finales acumulados</p>

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

          {isHost && (
            <button
              type="button"
              onClick={returnToLobby}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Volver a la Sala
            </button>
          )}
        </div>
      )}
    </div>
  );
};
