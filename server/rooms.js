// Room & Multiplayer Session Manager
import { TuttiFruttiGame } from './games/tutifruti.js';
import { ImpostorGame } from './games/impostor.js';
import { BombaGame } from './games/bomba.js';
import { GarticGame } from './games/gartic.js';
import { HivemindGame } from './games/hivemind.js';
import { MostLikelyGame } from './games/mostlikely.js';
import { FibbageGame } from './games/fibbage.js';
import { FiveSecondsGame } from './games/fiveseconds.js';
import { TabooGame } from './games/taboo.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export class Room {
  constructor(code, io) {
    this.code = code;
    this.io = io;
    this.hostId = null;
    this.players = new Map(); // socketId -> Player
    this.selectedGame = 'tutifruti'; // 'tutifruti' | 'impostor' | 'bomba'
    this.status = 'LOBBY'; // 'LOBBY' | 'PLAYING'
    this.gameInstance = null;
    this.introActive = false;
    this.introSeconds = 10;
    this.introSkips = new Set(); // Set of socketIds who voted to skip
    this.introTimer = null;
    this.settings = {
      rounds: 3,
      roundDuration: 90,
      customCategories: []
    };
    this.messages = [];
  }

  addPlayer(socket, playerData) {
    const isFirstPlayer = this.players.size === 0;
    const player = {
      id: socket.id,
      name: playerData.name || `Jugador ${this.players.size + 1}`,
      avatar: playerData.avatar || '😎',
      color: playerData.color || '#3B82F6',
      isHost: isFirstPlayer,
      isReady: false,
      progress: 0
    };

    if (isFirstPlayer) {
      this.hostId = socket.id;
    }

    this.players.set(socket.id, player);
    socket.join(this.code);
    socket.data.roomCode = this.code;

    this.broadcastState();
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.introSkips.delete(socketId);
    
    // If host left, assign new host
    if (this.hostId === socketId && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        this.hostId = nextHost.id;
      }
    }

    if (this.players.size === 0) {
      if (this.introTimer) clearInterval(this.introTimer);
      if (this.gameInstance?.countdownTimer) clearInterval(this.gameInstance.countdownTimer);
      if (this.gameInstance?.bombTimer) clearInterval(this.gameInstance.bombTimer);
      if (this.gameInstance?.timer) clearInterval(this.gameInstance.timer);
      return false; // Room is empty, can be deleted
    }

    // If waiting on skips and now everyone remaining has skipped
    if (this.introActive && this.players.size > 0 && this.introSkips.size >= this.players.size) {
      this.finishIntro();
      return true;
    }

    this.broadcastState();
    return true;
  }

  selectGame(gameId) {
    if (this.status !== 'LOBBY') return;
    this.selectedGame = gameId;
    this.broadcastState();
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.broadcastState();
  }

  startGame() {
    this.status = 'PLAYING';
    this.introActive = true;
    this.introSeconds = 10;
    this.introSkips = new Set();
    
    if (this.introTimer) clearInterval(this.introTimer);
    
    this.broadcastState();

    this.introTimer = setInterval(() => {
      this.introSeconds -= 1;
      this.io.to(this.code).emit('intro:tick', { secondsRemaining: this.introSeconds });

      if (this.introSeconds <= 0) {
        this.finishIntro();
      }
    }, 1000);
  }

  skipIntro(playerId) {
    if (!this.introActive) return;
    this.introSkips.add(playerId);
    
    this.io.to(this.code).emit('intro:skip_update', {
      skips: Array.from(this.introSkips),
      totalPlayers: this.players.size
    });

    if (this.introSkips.size >= this.players.size) {
      this.finishIntro();
    }
  }

  finishIntro() {
    if (!this.introActive) return;
    if (this.introTimer) {
      clearInterval(this.introTimer);
      this.introTimer = null;
    }
    this.introActive = false;
    this.introSeconds = 0;
    this.introSkips.clear();

    this.launchGameInstance();
  }

  launchGameInstance() {
    if (this.selectedGame === 'tutifruti') {
      const categories = this.settings.customCategories && this.settings.customCategories.length > 0 
        ? this.settings.customCategories 
        : undefined;
      this.gameInstance = new TuttiFruttiGame(this, { 
        rounds: this.settings.rounds,
        categories
      });
    } else if (this.selectedGame === 'impostor') {
      this.gameInstance = new ImpostorGame(this);
    } else if (this.selectedGame === 'bomba') {
      this.gameInstance = new BombaGame(this);
    } else if (this.selectedGame === 'gartic') {
      this.gameInstance = new GarticGame(this);
    } else if (this.selectedGame === 'hivemind') {
      this.gameInstance = new HivemindGame(this);
    } else if (this.selectedGame === 'mostlikely') {
      this.gameInstance = new MostLikelyGame(this);
    } else if (this.selectedGame === 'fibbage') {
      this.gameInstance = new FibbageGame(this);
    } else if (this.selectedGame === 'fiveseconds') {
      this.gameInstance = new FiveSecondsGame(this);
    } else if (this.selectedGame === 'taboo') {
      this.gameInstance = new TabooGame(this);
    }

    if (this.gameInstance) {
      this.gameInstance.start();
    } else {
      this.broadcastState();
    }
  }

  returnToLobby() {
    if (this.introTimer) clearInterval(this.introTimer);
    this.introActive = false;
    this.introSeconds = 0;
    this.introSkips.clear();

    if (this.gameInstance?.countdownTimer) clearInterval(this.gameInstance.countdownTimer);
    if (this.gameInstance?.bombTimer) clearInterval(this.gameInstance.bombTimer);
    if (this.gameInstance?.timer) clearInterval(this.gameInstance.timer);
    
    this.status = 'LOBBY';
    this.gameInstance = null;
    this.broadcastState();
  }

  sendReaction(playerId, emoji) {
    const player = this.players.get(playerId);
    if (!player) return;
    this.io.to(this.code).emit('room:reaction', {
      playerId,
      playerName: player.name,
      emoji
    });
  }

  sendMessage(playerId, text) {
    const player = this.players.get(playerId);
    if (!player) return;
    const msg = {
      id: Date.now().toString(),
      playerId,
      playerName: player.name,
      playerAvatar: player.avatar,
      text: (text || '').slice(0, 150),
      timestamp: Date.now()
    };
    this.messages.push(msg);
    if (this.messages.length > 30) this.messages.shift();
    this.io.to(this.code).emit('room:message', msg);
  }

  broadcastPlayerProgress(playerId, count) {
    const player = this.players.get(playerId);
    if (player) {
      player.progress = count;
      this.io.to(this.code).emit('tutifruti:player_progress', { playerId, count });
    }
  }

  broadcastState() {
    const playersList = Array.from(this.players.values());

    for (const [socketId] of this.players.entries()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) continue;

      const playerState = {
        code: this.code,
        hostId: this.hostId,
        players: playersList,
        selectedGame: this.selectedGame,
        status: this.status,
        settings: this.settings,
        gameState: this.gameInstance ? this.gameInstance.getStateForPlayer(socketId) : null,
        introState: this.introActive ? {
          active: true,
          secondsRemaining: this.introSeconds,
          skips: Array.from(this.introSkips),
          totalPlayers: this.players.size
        } : null
      };

      socket.emit('room:state', playerState);
    }
  }
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // code -> Room
  }

  createRoom(socket, playerData) {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const room = new Room(code, this.io);
    this.rooms.set(code, room);
    const player = room.addPlayer(socket, playerData);
    return { code, player };
  }

  joinRoom(socket, code, playerData) {
    const upperCode = (code || '').toUpperCase().trim();
    const room = this.rooms.get(upperCode);

    if (!room) {
      return { success: false, error: 'La sala no existe. Verifica el código.' };
    }

    if (room.status === 'PLAYING') {
      return { success: false, error: 'La partida ya ha comenzado en esta sala.' };
    }

    if (room.players.size >= 12) {
      return { success: false, error: 'La sala está llena (máximo 12 jugadores).' };
    }

    const player = room.addPlayer(socket, playerData);
    return { success: true, code: upperCode, player };
  }

  leaveRoom(socket) {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = this.rooms.get(code);
    if (room) {
      const hasPlayers = room.removePlayer(socket.id);
      if (!hasPlayers) {
        this.rooms.delete(code);
      }
    }

    socket.leave(code);
    delete socket.data.roomCode;
  }

  getRoom(code) {
    return this.rooms.get((code || '').toUpperCase().trim());
  }
}
