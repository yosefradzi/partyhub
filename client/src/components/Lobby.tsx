import React, { useState } from 'react';
import { usePartySocket } from '../context/SocketContext';
import { Copy, Check, Share2, Crown, Play, Settings as SettingsIcon, LogOut, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { DEFAULT_CATEGORIES, QUICK_EMOJIS, ALL_GAMES } from '../constants';

export const Lobby: React.FC = () => {
  const { room, isHost, selectGame, updateSettings, startGame, leaveRoom, sendReaction, sendMessage, messages } = usePartySocket();

  const [copied, setCopied] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  if (!room) return null;

  const currentCategories = room.settings.customCategories && room.settings.customCategories.length > 0
    ? room.settings.customCategories
    : DEFAULT_CATEGORIES;

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const inviteUrl = `${window.location.origin}?room=${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Únete a mi sala en PartyHub!',
          text: `¡Vamos a jugar a Tutti Frutti y otros minijuegos! Entra con el código: ${room.code}`,
          url: inviteUrl
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const updated = [...currentCategories, newCategory.trim()];
    updateSettings({ customCategories: updated });
    setNewCategory('');
    sounds.playClick();
  };

  const handleRemoveCategory = (index: number) => {
    if (currentCategories.length <= 3) {
      alert('Debes mantener al menos 3 categorías');
      return;
    }
    const updated = currentCategories.filter((_, i) => i !== index);
    updateSettings({ customCategories: updated });
    sounds.playClick();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto pb-48">
      {/* Top Bar with Room Code */}
      <div className="w-full glass-panel rounded-3xl p-4 shadow-xl flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Código de Sala
          </span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black font-mono tracking-widest text-amber-300">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copiar enlace"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleShare}
              title="Compartir sala"
              className="p-2 rounded-xl bg-indigo-600/50 hover:bg-indigo-600 text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={leaveRoom}
          className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>

      {/* Players Section */}
      <div className="w-full mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Jugadores conectados ({room.players.length}/12)
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {isHost ? 'Eres el Anfitrión 👑' : 'Esperando al anfitrión...'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {room.players.map((p) => (
            <div
              key={p.id}
              className="glass-card rounded-2xl p-3 flex items-center gap-3 border transition-all"
              style={{ borderColor: `${p.color}50` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner relative flex-shrink-0"
                style={{ backgroundColor: `${p.color}25` }}
              >
                {p.avatar}
                {p.isHost && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 rounded-full p-0.5 shadow-sm">
                    <Crown className="w-3 h-3 fill-current" />
                  </span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {p.isHost ? 'Anfitrión' : 'Listo'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minigames Selector */}
      <div className="w-full mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Elige el Minijuego
          </span>
          {isHost && (
            <button
              type="button"
              onClick={() => {
                setShowSettings(!showSettings);
                sounds.playClick();
              }}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              {showSettings ? 'Ocultar Ajustes' : 'Ajustes de Juego'}
            </button>
          )}
        </div>

        {/* Category Filter Tabs - Sticky on Mobile */}
        <div className="sticky top-2 z-20 py-2 -mx-1 px-1 mb-3 bg-slate-950/90 backdrop-blur-md rounded-2xl flex gap-1.5 overflow-x-auto scrollbar-none border border-slate-800/40">
          {['Todos', 'Palabras', 'Dibujo', 'Social', 'Velocidad'].map((cat) => {
            const count = cat === 'Todos' ? ALL_GAMES.length : ALL_GAMES.filter(g => g.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat);
                  sounds.playClick();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  categoryFilter === cat ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Full Natural Scrolling Games List */}
        <div className="flex flex-col gap-3">
          {ALL_GAMES
            .filter((g) => categoryFilter === 'Todos' || g.category === categoryFilter)
            .map((game) => {
              const isSelected = room.selectedGame === game.id;
              return (
                <div
                  key={game.id}
                  onClick={() => {
                    if (isHost) {
                      selectGame(game.id);
                      sounds.playClick();
                    }
                  }}
                  className={`p-3.5 sm:p-4 rounded-3xl border-2 transition-all relative overflow-hidden flex-shrink-0 ${
                    isHost ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
                  } ${
                    isSelected
                      ? `bg-gradient-to-r ${game.gradientBg} ${game.borderActiveColor} shadow-xl shadow-indigo-500/15`
                      : 'glass-card border-slate-800/80 hover:border-slate-700/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Fixed Emoji Box: never cropped or squished */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                      <span className="select-none leading-none">{game.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <h3 className="text-sm font-black text-white truncate">
                          {game.name}
                        </h3>
                        {isSelected ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex-shrink-0 flex items-center gap-1 shadow-md shadow-emerald-500/20">
                            <Check className="w-3 h-3 stroke-[3]" /> Elegido
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold flex-shrink-0 px-2 py-0.5 rounded-full bg-slate-800/70 border border-slate-700/40">
                            {game.category}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-1 leading-snug font-medium">
                        {game.tagline}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <span>👥</span> {game.recommendedPlayers}
                        </span>
                        {isSelected && !isHost && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            Elegido por el anfitrión
                          </span>
                        )}
                        {!isSelected && isHost && (
                          <span className="text-[10px] text-indigo-400/80 font-semibold">
                            Toca para elegir
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Settings Modal/Drawer (Host Only) */}
      {showSettings && isHost && (
        <div className="w-full glass-panel rounded-3xl p-4 mb-4 border border-indigo-500/40">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-indigo-400" />
            Configuración de {room.selectedGame === 'tutifruti' ? 'Tutti Frutti' : 'la Partida'}
          </h4>

          {room.selectedGame === 'tutifruti' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Número de Rondas:</label>
                <div className="flex gap-2">
                  {[2, 3, 5, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => updateSettings({ rounds: num })}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold ${
                        room.settings.rounds === num
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Categorías activas ({currentCategories.length}):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-36 overflow-y-auto">
                  {currentCategories.map((cat, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(i)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva categoría (ej: Película)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat messages overlay if opened */}
      {showChat && (
        <div className="fixed inset-x-4 bottom-24 max-w-lg mx-auto glass-panel rounded-3xl p-4 shadow-2xl border border-indigo-500/30 z-40 max-h-72 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              Chat de la Sala
            </span>
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1.5 text-xs">
            {messages.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No hay mensajes aún. ¡Saluda a tus amigos!</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex items-start gap-1.5">
                  <span className="text-sm">{m.playerAvatar}</span>
                  <div>
                    <span className="font-bold text-slate-300 mr-1">{m.playerName}:</span>
                    <span className="text-slate-200">{m.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              placeholder="Escribe algo..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs font-bold text-white">
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Floating Bottom Bar: Reactions, Chat & Start Game */}
      <div className="fixed inset-x-0 bottom-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,12px))] bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 z-30 shadow-2xl">
        <div className="max-w-lg mx-auto flex flex-col gap-2.5">
          {/* Quick reactions & Chat toggle */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowChat(!showChat)}
              className={`p-2.5 rounded-2xl flex items-center gap-1.5 text-xs font-bold transition-all ${
                showChat ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {messages.length > 0 && <span className="text-[10px] bg-indigo-500 px-1.5 rounded-full">{messages.length}</span>}
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="text-lg p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Start button for host or waiting banner */}
          {isHost ? (
            <button
              type="button"
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              ¡Comenzar Partida!
            </button>
          ) : (
            <div className="w-full py-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-center text-xs font-bold text-slate-300 flex items-center justify-center gap-2 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Esperando a que el anfitrión inicie el juego...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
