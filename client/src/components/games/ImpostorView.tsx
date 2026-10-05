import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { ImpostorState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import { Eye, MessageSquare, Home, ShieldAlert, Award } from 'lucide-react';

export const ImpostorView: React.FC = () => {
  const { room, socket, isHost, myPlayer, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as ImpostorState | null;

  const [revealed, setRevealed] = useState<boolean>(false);
  const [guessInput, setGuessInput] = useState<string>('');
  const [votedPlayerIdLocal, setVotedPlayerIdLocal] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  useEffect(() => {
    setVotedPlayerIdLocal(null);
    setIsAdvancing(false);
  }, [gameState?.phase]);

  if (!gameState || !room || !myPlayer) return null;

  const isImpostor = gameState.isImpostor;
  const isMyVote = (targetId: string) => (votedPlayerIdLocal || gameState.votes[myPlayer.id]) === targetId;

  const handleStartDiscussion = () => {
    if (socket && isHost && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('impostor:start_discussion');
      sounds.playClick();
    }
  };

  const handleStartVoting = () => {
    if (socket && isHost && !isAdvancing) {
      setIsAdvancing(true);
      socket.emit('impostor:start_voting');
      sounds.playClick();
    }
  };

  const handleVote = (targetPlayerId: string) => {
    if (socket && gameState.phase === 'VOTING' && !votedPlayerIdLocal && !gameState.votes[myPlayer.id]) {
      setVotedPlayerIdLocal(targetPlayerId);
      socket.emit('impostor:vote', { targetPlayerId });
      sounds.playClick();
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isAdvancing) return;
    if (socket && gameState.phase === 'GUESS_WORD') {
      setIsAdvancing(true);
      socket.emit('impostor:guess_word', { guess: guessInput.trim() });
      sounds.playSuccess();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">🕵️</span>
        <h2 className="text-2xl font-black text-white">El Impostor</h2>
        <p className="text-xs text-slate-400">
          Categoría: <span className="font-bold text-amber-300">{gameState.category}</span>
        </p>
      </div>

      {/* Secret Card Reveal Phase */}
      {gameState.phase === 'WORD_REVEAL' && (
        <div className="my-auto flex flex-col items-center">
          <div
            onMouseDown={() => setRevealed(true)}
            onMouseUp={() => setRevealed(false)}
            onTouchStart={() => setRevealed(true)}
            onTouchEnd={() => setRevealed(false)}
            className={`w-full max-w-xs h-60 rounded-3xl p-6 border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl select-none ${
              revealed
                ? isImpostor
                  ? 'bg-red-950/80 border-red-500 shadow-red-500/20'
                  : 'bg-indigo-950/80 border-indigo-400 shadow-indigo-500/20'
                : 'glass-panel border-slate-700 hover:border-slate-500'
            }`}
          >
            {revealed ? (
              isImpostor ? (
                <div className="animate-shake">
                  <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-2" />
                  <h3 className="text-xl font-black text-red-400 mb-1">¡ERES EL IMPOSTOR!</h3>
                  <p className="text-xs text-slate-300">
                    Nadie sabe quién eres. Deduce la palabra secreta escuchando las pistas de los demás.
                  </p>
                </div>
              ) : (
                <div>
                  <Award className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Tu Palabra Secreta
                  </p>
                  <h3 className="text-3xl font-black text-white mb-2">{gameState.word}</h3>
                  <p className="text-xs text-slate-300">
                    Da pistas sutiles sin ser demasiado obvio para que el impostor no la adivine.
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center">
                <Eye className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-sm font-bold text-white mb-1">Mantén presionado para ver</p>
                <p className="text-[11px] text-slate-400">Asegúrate de que nadie esté mirando tu pantalla</p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            {revealed ? 'Suelta para ocultar la palabra' : 'Mantén pulsada la tarjeta para leer tu rol'}
          </p>

          {isHost && (
            <button
              type="button"
              onClick={handleStartDiscussion}
              className="mt-6 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg"
            >
              Comenzar Ronda de Pistas y Debate 💬
            </button>
          )}
        </div>
      )}

      {/* Discussion Phase */}
      {gameState.phase === 'DISCUSSION' && (
        <div className="my-auto flex flex-col items-center gap-4">
          <div className="glass-panel rounded-3xl p-6 shadow-xl border border-indigo-500/30 w-full">
            <MessageSquare className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
            <h3 className="text-lg font-black text-white mb-2">¡Ronda de Preguntas y Pistas!</h3>
            <p className="text-xs text-slate-300 mb-4">
              Cada jugador por turnos debe decir una palabra o dar una pista sobre el tema. ¡Intenten atrapar al impostor!
            </p>

            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs text-slate-400">
              Categoría de la partida: <span className="font-bold text-amber-300">{gameState.category}</span>
            </div>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={handleStartVoting}
              className="w-full py-3.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-2xl shadow-lg"
            >
              Iniciar Votación de Sospechosos 🗳️
            </button>
          )}
        </div>
      )}

      {/* Voting Phase */}
      {gameState.phase === 'VOTING' && (
        <div className="w-full my-auto flex flex-col gap-3">
          <p className="text-xs font-bold text-pink-400 uppercase tracking-wider">
            ¿Quién crees que es el Impostor?
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {room.players.map((p) => {
              const votedThis = isMyVote(p.id);
              const hasVotedAny = Boolean(votedPlayerIdLocal || gameState.votes[myPlayer.id]);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={hasVotedAny}
                  onClick={() => handleVote(p.id)}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${
                    votedThis
                      ? 'bg-pink-600/30 border-pink-500 shadow-lg shadow-pink-500/20 scale-105'
                      : 'glass-card border-slate-800 hover:border-slate-600 active:scale-95'
                  }`}
                >
                  <span className="text-4xl">{p.avatar}</span>
                  <span className="text-xs font-bold text-white truncate max-w-full">{p.name}</span>
                  {votedThis && (
                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black">
                      ✓ Votado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {Boolean(votedPlayerIdLocal || gameState.votes[myPlayer.id]) && (
            <div className="py-2 px-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5 animate-pulse mt-2">
              <span>✓ Voto registrado • Esperando a los demás jugadores...</span>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Votos emitidos: {Object.keys(gameState.votes).length}/{room.players.length}
          </p>
        </div>
      )}

      {/* Guess Word (if Impostor caught) */}
      {gameState.phase === 'GUESS_WORD' && (
        <div className="my-auto flex flex-col items-center gap-4">
          <div className="glass-panel rounded-3xl p-6 shadow-xl border border-red-500/30 w-full">
            <h3 className="text-xl font-black text-red-400 mb-2">¡El Impostor fue descubierto!</h3>
            <p className="text-xs text-slate-300 mb-4">
              ¡Pero tiene una última oportunidad de robar la victoria si adivina la palabra secreta!
            </p>

            {isImpostor ? (
              <form onSubmit={handleGuessSubmit} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="¿Cuál crees que era la palabra secreta?"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm font-bold text-white uppercase"
                />
                <button
                  type="submit"
                  className="py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl"
                >
                  ¡Adivinar Palabra!
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-400 animate-pulse">
                El impostor está intentando adivinar la palabra...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results Phase */}
      {gameState.phase === 'ROUND_RESULTS' && (
        <div className="my-auto flex flex-col items-center gap-4">
          <div className="glass-panel rounded-3xl p-6 shadow-xl border border-indigo-500/30 w-full">
            <h3 className="text-2xl font-black text-white mb-2">
              {gameState.caughtImpostor ? (gameState.guessCorrect ? '¡El Impostor robó la victoria! 🤯' : '¡La Tripulación Gana! 🎉') : '¡El Impostor escapó con éxito! 🕵️'}
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              La palabra secreta era: <span className="font-extrabold text-amber-300">{gameState.word}</span>
            </p>
          </div>

          {isHost ? (
            <button
              type="button"
              onClick={returnToLobby}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Volver a la Sala
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
