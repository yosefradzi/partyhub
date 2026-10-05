import React, { useState, useRef, useEffect } from 'react';
import { usePartySocket } from '../../context/SocketContext';
import type { GarticState } from '../../types';
import { sounds } from '../../utils/soundEffects';
import { Eraser, RotateCcw, Send, CheckCircle, ArrowRight, ArrowLeft, Home, Sparkles } from 'lucide-react';

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#78350f'];
const BRUSH_SIZES = [3, 6, 12];

export const GarticView: React.FC = () => {
  const { room, socket, isHost, returnToLobby } = usePartySocket();
  const gameState = room?.gameState as GarticState | null;

  // Local states
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [guessInput, setGuessInput] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isSubmittedLocal, setIsSubmittedLocal] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Initialize and clear canvas when a drawing step starts
  useEffect(() => {
    setIsSubmittedLocal(false);
    if (gameState?.isDrawing && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  }, [gameState?.currentStep, gameState?.isDrawing, gameState?.phase]);

  // Tick sound
  useEffect(() => {
    if (gameState?.phase === 'IN_PROGRESS' || gameState?.phase === 'PROMPT_INPUT') {
      if (gameState.secondsRemaining <= 5 && gameState.secondsRemaining > 0) {
        sounds.playTick();
      }
    }
  }, [gameState?.secondsRemaining, gameState?.phase]);

  if (!gameState || !room) return null;

  // Drawing Canvas Functions
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.hasSubmitted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || gameState.hasSubmitted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save history state for undo
    setHistory((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const handleUndo = () => {
    if (history.length <= 1 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // remove current
    const previous = newHistory[newHistory.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(newHistory);
    sounds.playClick();
  };

  const handleClear = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    sounds.playClick();
  };

  // Submissions
  const handleSubmitPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialPrompt.trim() || !socket || isSubmittedLocal) return;
    setIsSubmittedLocal(true);
    socket.emit('gartic:submit_prompt', { text: initialPrompt.trim() });
    sounds.playSuccess();
  };

  const handleSubmitDrawing = () => {
    if (!canvasRef.current || !socket || isSubmittedLocal) return;
    setIsSubmittedLocal(true);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    socket.emit('gartic:submit_content', { content: dataUrl });
    sounds.playSuccess();
  };

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || !socket || isSubmittedLocal) return;
    setIsSubmittedLocal(true);
    socket.emit('gartic:submit_content', { content: guessInput.trim() });
    setGuessInput('');
    sounds.playSuccess();
  };

  // Presentation controls
  const handleNextPresentation = () => {
    if (socket && isHost) {
      socket.emit('gartic:next_presentation');
      sounds.playClick();
    }
  };

  const handlePrevPresentation = () => {
    if (socket && isHost) {
      socket.emit('gartic:prev_presentation');
      sounds.playClick();
    }
  };

  // --- PHASE 1: INITIAL PROMPT INPUT ---
  if (gameState.phase === 'PROMPT_INPUT') {
    return (
      <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
        <div className="pt-4">
          <span className="text-4xl block mb-2">🎨</span>
          <h2 className="text-2xl font-black text-white">Escribe una Frase Inicial</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sé creativo y escribe una frase extraña o divertida para que tu amigo la dibuje.
          </p>
        </div>

        <div className="my-auto glass-panel rounded-3xl p-6 shadow-2xl border border-sky-500/30">
          <div className="text-sm font-bold text-sky-400 mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Tiempo restante: {gameState.secondsRemaining}s
          </div>

          {!Boolean(gameState.hasSubmitted || isSubmittedLocal) ? (
            <form onSubmit={handleSubmitPrompt} className="flex flex-col gap-3">
              <textarea
                rows={3}
                maxLength={90}
                placeholder="Ej: Un perro astronauta jugando fútbol con un marciano..."
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3.5 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                type="submit"
                disabled={!initialPrompt.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                ¡Enviar Frase!
              </button>
            </form>
          ) : (
            <div className="py-8 flex flex-col items-center gap-2 animate-fade-in">
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
    );
  }

  // --- PHASE 2: IN PROGRESS (DRAWING OR GUESSING) ---
  if (gameState.phase === 'IN_PROGRESS') {
    const isDrawingStep = gameState.isDrawing;
    const prevItem = gameState.previousItem;

    return (
      <div className="min-h-screen flex flex-col justify-between p-3 max-w-lg mx-auto pb-24">
        {/* Header Bar */}
        <div className="glass-panel rounded-2xl p-3 flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
              Paso {gameState.currentStep} de {gameState.totalSteps}
            </span>
            <h3 className="text-sm font-extrabold text-white">
              {isDrawingStep ? '🎨 ¡Dibuja lo que lees!' : '🤔 ¡Adivina el dibujo!'}
            </h3>
          </div>
          <div className="text-xl font-mono font-black text-amber-300 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            {gameState.secondsRemaining}s
          </div>
        </div>

        {/* Prompt To Draw OR Drawing To Guess */}
        {isDrawingStep ? (
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl mb-2 text-center">
            <span className="text-[10px] text-indigo-400 font-bold uppercase block">Debes dibujar:</span>
            <p className="text-base font-black text-white italic">"{prevItem?.content || 'Algo divertido'}"</p>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-2">
            <div className="w-full max-h-56 bg-white rounded-2xl overflow-hidden border-2 border-slate-700 flex items-center justify-center shadow-lg">
              {prevItem?.content ? (
                <img src={prevItem.content} alt="Dibujo a adivinar" className="max-h-56 w-auto object-contain" />
              ) : (
                <span className="text-slate-400 text-xs py-10">(Sin dibujo)</span>
              )}
            </div>
          </div>
        )}

        {/* Interaction Area: Canvas or Text Input */}
        {isDrawingStep ? (
          <div className="flex flex-col gap-2">
            {/* Canvas */}
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-slate-700 touch-none flex justify-center">
              <canvas
                ref={canvasRef}
                width={360}
                height={260}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-auto cursor-crosshair block"
              />
            </div>

            {/* Drawing Controls */}
            {!gameState.hasSubmitted && (
              <div className="flex flex-col gap-2 glass-panel p-2.5 rounded-2xl">
                {/* Palette */}
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c);
                        sounds.playClick();
                      }}
                      className={`w-6 h-6 rounded-full border border-slate-400 transition-transform ${
                        selectedColor === c ? 'scale-125 ring-2 ring-sky-400' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Brushes & Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {BRUSH_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setBrushSize(size)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          brushSize === size ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span style={{ width: size, height: size }} className="rounded-full bg-current block" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedColor('#ffffff')}
                      className={`p-1.5 rounded-xl ${selectedColor === '#ffffff' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      title="Goma de borrar"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                      title="Deshacer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-2 py-1 bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {!Boolean(gameState.hasSubmitted || isSubmittedLocal) ? (
              <button
                type="button"
                onClick={handleSubmitDrawing}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                ¡Enviar mi Dibujo!
              </button>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center flex flex-col items-center gap-1 animate-pulse">
                <span className="text-xs font-black text-emerald-300">✓ Dibujo enviado</span>
                <span className="text-[11px] text-slate-300">Esperando a los demás jugadores...</span>
              </div>
            )}
          </div>
        ) : (
          /* Guess input form */
          <div className="flex flex-col gap-3">
            {!Boolean(gameState.hasSubmitted || isSubmittedLocal) ? (
              <form onSubmit={handleSubmitGuess} className="flex flex-col gap-2">
                <input
                  type="text"
                  maxLength={70}
                  placeholder="¿Qué representa este dibujo?..."
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <button
                  type="submit"
                  disabled={!guessInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  ¡Enviar Adivinanza!
                </button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center flex flex-col items-center gap-1 animate-pulse">
                <span className="text-xs font-black text-emerald-300">✓ Adivinanza enviada</span>
                <span className="text-[11px] text-slate-300">Esperando a los demás jugadores...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- PHASE 3: PRESENTATION / ALBUM SLIDESHOW ---
  const chains = gameState.chains || {};
  const currentAuthorId = gameState.presentationChainAuthor;
  const currentChain = currentAuthorId ? chains[currentAuthorId] || [] : [];
  const currentItem = currentChain[gameState.presentationStepIndex];
  const originalAuthor = room.players.find(p => p.id === currentAuthorId);
  const currentItemAuthor = room.players.find(p => p.id === currentItem?.authorId);

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 max-w-lg mx-auto pb-24 text-center">
      {/* Presentation Header */}
      <div className="pt-2">
        <span className="text-3xl block mb-1">🎬</span>
        <h2 className="text-2xl font-black text-white">El Álbum del Teléfono Descompuesto</h2>
        <p className="text-xs text-slate-400">
          Cadena iniciada por: <span className="font-bold text-sky-300">{originalAuthor?.name} {originalAuthor?.avatar}</span>
        </p>
      </div>

      {/* Main Slide Card */}
      <div className="my-auto glass-panel rounded-3xl p-5 shadow-2xl border border-sky-500/30 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{currentItemAuthor?.avatar}</span>
          <span className="text-xs font-bold text-slate-300">{currentItemAuthor?.name}</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
            {currentItem?.type === 'text' ? (gameState.presentationStepIndex === 0 ? 'Frase Original' : 'Adivinanza') : 'Dibujo'}
          </span>
        </div>

        {currentItem?.type === 'text' ? (
          <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800 w-full my-4">
            <p className="text-xl font-black text-white italic leading-relaxed">
              "{currentItem.content}"
            </p>
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl my-2">
            {currentItem?.content ? (
              <img src={currentItem.content} alt="Dibujo de la cadena" className="w-full h-auto object-contain max-h-64" />
            ) : (
              <span className="text-slate-400 text-xs py-10">(Sin dibujo)</span>
            )}
          </div>
        )}

        {/* Step indicator */}
        <div className="flex gap-1.5 mt-3">
          {currentChain.map((_, idx) => (
            <span
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === gameState.presentationStepIndex ? 'bg-sky-400 scale-125' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="w-full flex flex-col gap-2">
        {isHost ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrevPresentation}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={handleNextPresentation}
              className="flex-2 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-1.5"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 animate-pulse">
            El anfitrión está pasando las diapositivas del álbum...
          </p>
        )}

        {isHost && (
          <button
            type="button"
            onClick={returnToLobby}
            className="w-full py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" /> Volver a la Sala
          </button>
        )}
      </div>
    </div>
  );
};
