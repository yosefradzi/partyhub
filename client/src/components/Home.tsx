import React, { useState, useEffect } from 'react';
import { usePartySocket } from '../context/SocketContext';
import { Sparkles, Users, Play, PlusCircle, LogIn, Download, Smartphone } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const AVATARS = ['😎', '🤠', '🦊', '🐱', '🐶', '🦄', '🐼', '🦁', '🐸', '🚀', '⭐', '🍕', '🌮', '🔥', '👑', '👾'];
const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export const Home: React.FC = () => {
  const { createRoom, joinRoom, isConnected } = usePartySocket();

  const [name, setName] = useState<string>(() => localStorage.getItem('party_name') || '');
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem('party_avatar') || '😎');
  const [color, setColor] = useState<string>(() => localStorage.getItem('party_color') || '#3B82F6');
  const [roomCode, setRoomCode] = useState<string>('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // Check URL query parameters for ?room=ABCD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      setTab('join');
    }

    // PWA Install prompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleSaveProfile = () => {
    localStorage.setItem('party_name', name.trim());
    localStorage.setItem('party_avatar', avatar);
    localStorage.setItem('party_color', color);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Por favor escribe tu apodo o nombre');
      sounds.playError();
      return;
    }
    setError('');
    setLoading(true);
    handleSaveProfile();

    const res = await createRoom({
      name: name.trim(),
      avatar,
      color
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Error al crear la sala');
      sounds.playError();
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Por favor escribe tu apodo o nombre');
      sounds.playError();
      return;
    }
    if (!roomCode.trim()) {
      setError('Escribe el código de la sala');
      sounds.playError();
      return;
    }
    setError('');
    setLoading(true);
    handleSaveProfile();

    const res = await joinRoom(roomCode.trim(), {
      name: name.trim(),
      avatar,
      color
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'No se pudo unir a la sala');
      sounds.playError();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 max-w-md mx-auto">
      {/* Header */}
      <header className="w-full text-center pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          PWA Multijugador en Tiempo Real
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-400 bg-clip-text text-transparent">
          PartyHub
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Minijuegos para jugar con amigos: Tutti Frutti, El Impostor y La Bomba
        </p>
      </header>

      {/* Profile Card */}
      <div className="w-full glass-panel rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        {/* Avatar & Color Picker */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 transition-transform transform active:scale-95"
            style={{ backgroundColor: `${color}25`, borderColor: color }}
          >
            {avatar}
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Tu Nombre / Apodo
            </label>
            <input
              type="text"
              maxLength={15}
              placeholder="Ej: Marcos, Sofi..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Avatar selector list */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Elige tu Avatar:</label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => {
                  setAvatar(av);
                  sounds.playClick();
                }}
                className={`text-xl p-2 rounded-xl transition-all ${
                  avatar === av
                    ? 'bg-indigo-600 scale-110 shadow-md ring-2 ring-indigo-400'
                    : 'bg-slate-800/80 hover:bg-slate-700'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Color selector list */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Color de jugador:</label>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  sounds.playClick();
                }}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <hr className="border-slate-800 my-1" />

        {/* Navigation Tabs (Crear vs Unirse) */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('create');
              setError('');
              sounds.playClick();
            }}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'create'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Crear Sala
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('join');
              setError('');
              sounds.playClick();
            }}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'join'
                ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Unirse con Código
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        {/* Tab Content: Create Room */}
        {tab === 'create' ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-400 text-center">
              Serás el anfitrión y podrás elegir minijuegos como Tutti Frutti, cambiar reglas y configurar rondas.
            </p>
            <button
              type="button"
              disabled={loading || !isConnected}
              onClick={handleCreate}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 hover:from-indigo-500 to-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              {loading ? 'Creando sala...' : 'Crear Sala y Jugar'}
            </button>
          </div>
        ) : (
          /* Tab Content: Join Room */
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Código de 4 letras de la sala:
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="ABCD"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 text-center text-2xl font-mono tracking-widest uppercase font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <button
              type="button"
              disabled={loading || !isConnected}
              onClick={handleJoin}
              className="w-full py-3.5 bg-gradient-to-r from-pink-600 hover:from-pink-500 to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              <Users className="w-5 h-5" />
              {loading ? 'Entrando...' : 'Entrar a la Sala'}
            </button>
          </div>
        )}

        {/* Server connection indicator */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-1">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
          {isConnected ? 'Conectado al servidor en tiempo real' : 'Conectando al servidor...'}
        </div>
      </div>

      {/* PWA Install Banner */}
      {isInstallable && (
        <div className="w-full mt-4 p-3 bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/40 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Instalar como App PWA</p>
              <p className="text-[10px] text-slate-400">Juega en pantalla completa sin barra del navegador</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-500 py-3">
        Hecho para jugar en vivo desde el móvil o PC 📱💻
      </footer>
    </div>
  );
};
