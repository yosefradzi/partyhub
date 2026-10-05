// La Bomba (Word Bomb / Tik Tak Boum) Game Engine

export const BOMB_SYLLABLES = [
  'PA', 'TE', 'RO', 'CA', 'MA', 'SO', 'TI', 'LA', 'DE', 'ME',
  'RA', 'CO', 'BA', 'TO', 'LE', 'SE', 'DO', 'TA', 'NO', 'RE',
  'PO', 'LO', 'SI', 'PE', 'FA', 'LI', 'MO', 'SA', 'PI', 'MI',
  'BRA', 'PLA', 'CRO', 'TRA', 'GRA', 'BLA', 'CLA', 'FLA', 'PRO'
];

export class BombaGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'bomba';
    this.name = 'La Bomba de Palabras';
    this.lives = {}; // playerId -> number
    this.playerOrder = [];
    this.activePlayerIndex = 0;
    this.currentSyllable = '';
    this.usedWords = new Set();
    this.phase = 'PLAYING'; // PLAYING | EXPLODED | GAME_OVER
    this.bombTimer = null;
    this.baseTurnSeconds = 10;
    this.secondsRemaining = 10;
    this.loserId = null;

    // Initialize 3 lives per player
    for (const pid of this.room.players.keys()) {
      this.lives[pid] = 3;
      this.playerOrder.push(pid);
    }
  }

  start() {
    this.playerOrder = Array.from(this.room.players.keys()).sort(() => 0.5 - Math.random());
    this.activePlayerIndex = 0;
    for (const pid of this.room.players.keys()) {
      this.lives[pid] = 3;
    }
    this.usedWords = new Set();
    this.startTurn();
  }

  startTurn() {
    const activePlayerId = this.getActivePlayerId();
    if (!activePlayerId) {
      this.checkGameOver();
      return;
    }

    this.currentSyllable = BOMB_SYLLABLES[Math.floor(Math.random() * BOMB_SYLLABLES.length)];
    this.secondsRemaining = this.baseTurnSeconds;
    this.phase = 'PLAYING';
    this.loserId = null;

    if (this.bombTimer) clearInterval(this.bombTimer);

    this.room.broadcastState();

    this.bombTimer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('bomba:tick', {
        secondsRemaining: this.secondsRemaining,
        activePlayerId: this.getActivePlayerId()
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.bombTimer);
        this.bombTimer = null;
        this.explodeBomb();
      }
    }, 1000);
  }

  getActivePlayerId() {
    const alivePlayers = this.playerOrder.filter(pid => (this.lives[pid] || 0) > 0);
    if (alivePlayers.length <= 1) return null;
    return this.playerOrder[this.activePlayerIndex];
  }

  normalize(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  submitWord(playerId, rawWord) {
    if (this.phase !== 'PLAYING') return { success: false, reason: 'No está en juego' };
    if (playerId !== this.getActivePlayerId()) return { success: false, reason: 'No es tu turno' };

    const word = this.normalize(rawWord);
    const syllable = this.normalize(this.currentSyllable);

    if (word.length < 3) {
      return { success: false, reason: 'Demasiado corta (mínimo 3 letras)' };
    }

    if (!word.includes(syllable)) {
      return { success: false, reason: `Debe contener "${this.currentSyllable}"` };
    }

    if (this.usedWords.has(word)) {
      return { success: false, reason: 'Palabra ya utilizada' };
    }

    this.usedWords.add(word);

    // Advance to next alive player
    this.nextTurn();
    return { success: true };
  }

  nextTurn() {
    let nextIndex = (this.activePlayerIndex + 1) % this.playerOrder.length;
    // Find next player with lives > 0
    let loopCount = 0;
    while ((this.lives[this.playerOrder[nextIndex]] || 0) <= 0 && loopCount < this.playerOrder.length) {
      nextIndex = (nextIndex + 1) % this.playerOrder.length;
      loopCount++;
    }

    this.activePlayerIndex = nextIndex;
    this.startTurn();
  }

  explodeBomb() {
    const victimId = this.getActivePlayerId();
    this.loserId = victimId;
    if (victimId) {
      this.lives[victimId] = Math.max(0, (this.lives[victimId] || 0) - 1);
    }

    this.phase = 'EXPLODED';
    this.room.broadcastState();

    setTimeout(() => {
      const alive = this.playerOrder.filter(pid => (this.lives[pid] || 0) > 0);
      if (alive.length <= 1) {
        this.phase = 'GAME_OVER';
        this.winnerId = alive[0] || null;
        this.room.broadcastState();
      } else {
        this.nextTurn();
      }
    }, 3000);
  }

  checkGameOver() {
    const alive = this.playerOrder.filter(pid => (this.lives[pid] || 0) > 0);
    if (alive.length <= 1) {
      this.phase = 'GAME_OVER';
      this.winnerId = alive[0] || null;
      if (this.bombTimer) clearInterval(this.bombTimer);
      this.room.broadcastState();
    }
  }

  getStateForPlayer(playerId) {
    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      currentSyllable: this.currentSyllable,
      activePlayerId: this.getActivePlayerId(),
      secondsRemaining: this.secondsRemaining,
      lives: this.lives,
      loserId: this.loserId,
      winnerId: this.winnerId,
      isMyTurn: playerId === this.getActivePlayerId(),
      usedWordsCount: this.usedWords.size,
      completedPlayerIds: this.getActivePlayerId() ? [this.getActivePlayerId()] : []
    };
  }
}
