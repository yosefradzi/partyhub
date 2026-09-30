import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// In production, serve the client build
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  // CREATE ROOM
  socket.on('room:create', (playerData, callback) => {
    try {
      const result = roomManager.createRoom(socket, playerData || {});
      if (typeof callback === 'function') {
        callback({ success: true, code: result.code, player: result.player });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // JOIN ROOM
  socket.on('room:join', (data, callback) => {
    try {
      const { code, ...playerData } = data || {};
      const result = roomManager.joinRoom(socket, code, playerData);
      if (typeof callback === 'function') {
        callback(result);
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // LEAVE ROOM
  socket.on('room:leave', () => {
    roomManager.leaveRoom(socket);
  });

  // SELECT GAME (Host only)
  socket.on('room:select_game', ({ gameId }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.hostId === socket.id) {
      room.selectGame(gameId);
    }
  });

  // UPDATE SETTINGS (Host only)
  socket.on('room:update_settings', ({ settings }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.hostId === socket.id) {
      room.updateSettings(settings);
    }
  });

  // START GAME (Host only)
  socket.on('room:start_game', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.hostId === socket.id) {
      room.startGame();
    }
  });

  // RETURN TO LOBBY (Host only)
  socket.on('room:return_lobby', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.hostId === socket.id) {
      room.returnToLobby();
    }
  });

  // REACTIONS & CHAT
  socket.on('room:reaction', ({ emoji }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room) {
      room.sendReaction(socket.id, emoji);
    }
  });

  socket.on('room:message', ({ text }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room) {
      room.sendMessage(socket.id, text);
    }
  });

  // --- TUTTI FRUTTI EVENTS ---
  socket.on('tutifruti:input', (data) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'tutifruti') {
      room.gameInstance.handlePlayerInput(socket.id, data);
    }
  });

  socket.on('tutifruti:call_stop', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'tutifruti') {
      room.gameInstance.handleCallStop(socket.id);
    }
  });

  socket.on('tutifruti:toggle_validation', ({ reviewKey }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'tutifruti') {
      room.gameInstance.toggleAnswerValidation(socket.id, reviewKey);
    }
  });

  socket.on('tutifruti:finalize_voting', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'tutifruti' && room.hostId === socket.id) {
      room.gameInstance.finalizeVoting();
    }
  });

  socket.on('tutifruti:next_round', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'tutifruti' && room.hostId === socket.id) {
      room.gameInstance.nextRound();
    }
  });

  // --- IMPOSTOR EVENTS ---
  socket.on('impostor:start_discussion', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'impostor' && room.hostId === socket.id) {
      room.gameInstance.startDiscussion();
    }
  });

  socket.on('impostor:start_voting', () => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'impostor' && room.hostId === socket.id) {
      room.gameInstance.startVoting();
    }
  });

  socket.on('impostor:vote', ({ targetPlayerId }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'impostor') {
      room.gameInstance.vote(socket.id, targetPlayerId);
    }
  });

  socket.on('impostor:guess_word', ({ guess }) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'impostor') {
      room.gameInstance.submitImpostorGuess(socket.id, guess);
    }
  });

  // --- LA BOMBA EVENTS ---
  socket.on('bomba:submit_word', ({ word }, callback) => {
    const code = socket.data.roomCode;
    const room = roomManager.getRoom(code);
    if (room && room.gameInstance?.id === 'bomba') {
      const res = room.gameInstance.submitWord(socket.id, word);
      if (typeof callback === 'function') callback(res);
    }
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    roomManager.leaveRoom(socket);
  });
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Servidor de Minijuegos corriendo en http://localhost:${PORT}`);
});
