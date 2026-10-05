import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, Player, ReactionEvent, ChatMessage, GameId } from '../types';
import { sounds } from '../utils/soundEffects';

interface SocketContextValue {
  socket: Socket | null;
  room: RoomState | null;
  myPlayer: Player | null;
  isHost: boolean;
  isConnected: boolean;
  reactions: ReactionEvent[];
  messages: ChatMessage[];
  createRoom: (playerData: { name: string; avatar: string; color: string }) => Promise<{ success: boolean; code?: string; error?: string }>;
  joinRoom: (code: string, playerData: { name: string; avatar: string; color: string }) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  selectGame: (gameId: GameId) => void;
  updateSettings: (settings: Partial<RoomState['settings']>) => void;
  startGame: () => void;
  returnToLobby: () => void;
  skipIntro: () => void;
  sendReaction: (emoji: string) => void;
  sendMessage: (text: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Connect to VITE_SOCKET_URL if provided (e.g. on Vercel), or fallback to same origin
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('room:state', (roomData: RoomState) => {
      setRoom(roomData);
    });

    // Handle universal countdown timer ticks
    const handleGameTick = (data: { secondsRemaining: number }) => {
      setRoom((prev) => {
        if (!prev || !prev.gameState) return prev;
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            secondsRemaining: data.secondsRemaining
          }
        };
      });
    };

    newSocket.on('game:tick', handleGameTick);
    newSocket.on('hivemind:tick', handleGameTick);
    newSocket.on('fibbage:tick', handleGameTick);
    newSocket.on('gartic:tick', handleGameTick);
    newSocket.on('taboo:tick', handleGameTick);
    newSocket.on('fiveseconds:tick', handleGameTick);
    newSocket.on('mostlikely:tick', handleGameTick);
    newSocket.on('bomba:tick', handleGameTick);

    // Tutti Frutti stop countdown
    newSocket.on('tutifruti:countdown', (data: { seconds: number; caller?: any }) => {
      setRoom((prev) => {
        if (!prev || !prev.gameState) return prev;
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            countdownSeconds: data.seconds,
            ...(data.caller ? { stopCaller: data.caller } : {})
          }
        };
      });
    });

    // Intro screen 10s countdown & skips
    newSocket.on('intro:tick', (data: { secondsRemaining: number }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          introState: prev.introState ? {
            ...prev.introState,
            secondsRemaining: data.secondsRemaining
          } : {
            active: true,
            secondsRemaining: data.secondsRemaining,
            skips: [],
            totalPlayers: prev.players.length
          }
        };
      });
    });

    newSocket.on('intro:skip_update', (data: { skips: string[]; totalPlayers: number }) => {
      setRoom((prev) => {
        if (!prev || !prev.introState) return prev;
        return {
          ...prev,
          introState: {
            ...prev.introState,
            skips: data.skips,
            totalPlayers: data.totalPlayers
          }
        };
      });
    });

    newSocket.on('room:reaction', (reaction: { playerId: string; playerName: string; emoji: string }) => {
      const event: ReactionEvent = {
        id: Math.random().toString(),
        ...reaction
      };
      setReactions((prev) => [...prev.slice(-15), event]);
      sounds.playClick();
    });

    newSocket.on('room:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-25), msg]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const myPlayer = room && socket ? room.players.find(p => p.id === socket.id) || null : null;
  const isHost = Boolean(room && socket && room.hostId === socket.id);

  const createRoom = (playerData: { name: string; avatar: string; color: string }) => {
    return new Promise<{ success: boolean; code?: string; error?: string }>((resolve) => {
      if (!socket) return resolve({ success: false, error: 'No conectado al servidor' });
      socket.emit('room:create', playerData, (res: { success: boolean; code?: string; error?: string }) => {
        if (res.success) {
          sounds.playSuccess();
        }
        resolve(res);
      });
    });
  };

  const joinRoom = (code: string, playerData: { name: string; avatar: string; color: string }) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socket) return resolve({ success: false, error: 'No conectado al servidor' });
      socket.emit('room:join', { code, ...playerData }, (res: { success: boolean; error?: string }) => {
        if (res.success) {
          sounds.playSuccess();
        } else {
          sounds.playError();
        }
        resolve(res);
      });
    });
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit('room:leave');
      setRoom(null);
      setMessages([]);
      setReactions([]);
    }
  };

  const selectGame = (gameId: GameId) => {
    if (socket && isHost) {
      socket.emit('room:select_game', { gameId });
      sounds.playClick();
    }
  };

  const updateSettings = (settings: Partial<RoomState['settings']>) => {
    if (socket && isHost) {
      socket.emit('room:update_settings', { settings });
    }
  };

  const startGame = () => {
    if (socket && isHost) {
      socket.emit('room:start_game');
      sounds.playVictory();
    }
  };

  const returnToLobby = () => {
    if (socket && isHost) {
      socket.emit('room:return_lobby');
      sounds.playClick();
    }
  };

  const skipIntro = () => {
    if (socket) {
      socket.emit('room:skip_intro');
      sounds.playClick();
    }
  };

  const sendReaction = (emoji: string) => {
    if (socket && room) {
      socket.emit('room:reaction', { emoji });
      sounds.playClick();
    }
  };

  const sendMessage = (text: string) => {
    if (socket && room && text.trim()) {
      socket.emit('room:message', { text: text.trim() });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        room,
        myPlayer,
        isHost,
        isConnected,
        reactions,
        messages,
        createRoom,
        joinRoom,
        leaveRoom,
        selectGame,
        updateSettings,
        startGame,
        returnToLobby,
        skipIntro,
        sendReaction,
        sendMessage
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const usePartySocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('usePartySocket must be used within a SocketProvider');
  }
  return context;
};
