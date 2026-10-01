import React, { useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { TabooState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Ban, CheckCircle, SkipForward, ArrowRight, Home, Play, AlertOctagon } from 'lucide-react';

export const TabooView: React.FC = () => {
  const { room, socket, isHost, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as TabooState | null;

  useEffect(() => {
    if (gameState?.phase === 'PLAYING') {
      if (gameState.secondsRemaining <= 10 && gameState.secondsRemaining > 0) {
        sounds.playTick();
      }
    } else if (gameState?.phase === 'FINAL_PODIUM') {
      sounds.playVictory();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }, [gameState?.phase, gameState?.secondsRemaining]);

  if (!gameState || !room) return null;

  const isDescriber = gameState.isDescriber;
  const activePlayer = room.players.find(p => p.id === gameState.activePlayerId);
  const card = gameState.currentCard;

  const handleStartTimer = () => {
    if (!socket) return;
    socket.emit('taboo:start_timer');
    sounds.playLetterReveal();
  };

  const handleGuessed = () => {
    if (!socket || !isDescriber) return;
    socket.emit('taboo:guessed');
    sounds.playSuccess();
  };

  const handleTaboo = () => {
    if (!socket || !isDescriber) return;
    socket.emit('taboo:taboo');
    sounds.playError();
  };

  const handlePass = () => {
    if (!socket || !isDescriber) return;
    socket.emit('taboo:pass');
    sounds.playClick();
  };

  const handleNextTurn = () => {
    if (!socket || !isHost) return;
    socket.emit('taboo:next_turn');
    sounds.playClick();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">🤐</span>
        <h2 className="text-2xl font-black text-white">Tabú</h2>
        <p className="text-xs text-slate-400">
          ¡Describe la palabra sin pronunciar ninguna de las prohibidas!
        </p>
      </div>

      {/* Main Container */}
      <div className="my-auto flex flex-col items-center gap-3 w-full">
        {/* Describer info */}
        <div className="flex items-center justify-between w-full glass-panel px-4 py-2 rounded-2xl border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activePlayer?.avatar}</span>
            <span className="text-xs font-bold text-white">
              {isDescriber ? '¡Te toca describir a ti!' : `Describe: ${activePlayer?.name}`}
            </span>
          </div>
          {gameState.phase === 'PLAYING' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">Puntos: {gameState.turnScore}</span>
              <span className="font-mono text-base font-black text-amber-300 bg-slate-900 px-2 py-0.5 rounded-lg">
                {gameState.secondsRemaining}s
              </span>
            </div>
          )}
        </div>

        {/* PHASE 1: GET READY */}
        {gameState.phase === 'GET_READY' && (
          <div className="w-full glass-panel rounded-3xl p-6 shadow-2xl border border-emerald-500/30 flex flex-col gap-4">
            <h3 className="text-lg font-black text-white">
              {isDescriber ? '¿Listo para describir?' : `Esperando a que ${activePlayer?.name} comience...`}
            </h3>
            <p className="text-xs text-slate-300">
              Tendrás 60 segundos para hacer que tus compañeros adivinen la mayor cantidad de palabras posible sin pronunciar las palabras prohibidas.
            </p>

            {(isDescriber || isHost) && (
              <button
                type="button"
                onClick={handleStartTimer}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> ¡Comenzar 60 Segundos!
              </button>
            )}
          </div>
        )}

        {/* PHASE 2: PLAYING */}
        {gameState.phase === 'PLAYING' && card && (
          <div className="w-full flex flex-col gap-3">
            {/* The Taboo Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-2xl border-2 border-emerald-500 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                {isDescriber ? 'Palabra a Adivinar' : 'Palabra Secreta'}
              </span>
              <h3 className="text-3xl font-black text-white tracking-wide mb-4">
                {card.word}
              </h3>

              <div className="w-full border-t border-slate-700/80 pt-3 flex flex-col items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1 mb-2">
                  <AlertOctagon className="w-3.5 h-3.5" /> Palabras Prohibidas (Tabú):
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {card.forbidden.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 font-bold text-xs"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Describer Actions */}
            {isDescriber ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleTaboo}
                  className="py-3.5 rounded-2xl bg-red-600/30 hover:bg-red-600/40 text-red-400 border border-red-500/40 font-bold text-xs flex flex-col items-center gap-1"
                >
                  <Ban className="w-5 h-5" /> Tabú (-1)
                </button>
                <button
                  type="button"
                  onClick={handlePass}
                  className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex flex-col items-center gap-1"
                >
                  <SkipForward className="w-5 h-5" /> Pasar
                </button>
                <button
                  type="button"
                  onClick={handleGuessed}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs flex flex-col items-center gap-1 shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" /> ¡Acierto! (+1)
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 font-medium">
                👀 Eres árbitro. Si {activePlayer?.name} dice alguna de las palabras en rojo, ¡grita TABÚ!
              </div>
            )}
          </div>
        )}

        {/* PHASE 3: TURN SUMMARY */}
        {gameState.phase === 'TURN_SUMMARY' && (
          <div className="w-full glass-panel rounded-3xl p-6 shadow-2xl border border-emerald-500/30 flex flex-col items-center gap-3">
            <span className="text-5xl mb-1">🎉</span>
            <h3 className="text-2xl font-black text-white">¡Fin del Turno de {activePlayer?.name}!</h3>
            <p className="text-sm font-bold text-emerald-400">
              Palabras adivinadas: {gameState.turnScore} (+{gameState.turnScore} pts)
            </p>

            {gameState.cardsGuessed.length > 0 && (
              <div className="w-full bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-slate-400 block mb-1">Adivinadas:</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  {gameState.cardsGuessed.map((w, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isHost && (
              <button
                type="button"
                onClick={handleNextTurn}
                className="mt-3 w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2"
              >
                Siguiente Turno <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* FINAL PODIUM */}
        {gameState.phase === 'FINAL_PODIUM' && (
          <div className="w-full my-auto flex flex-col gap-3">
            <div className="text-6xl mb-1">🏆</div>
            <h3 className="text-3xl font-black text-white">¡Fin del Tabú!</h3>
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
    </div>
  );
};
