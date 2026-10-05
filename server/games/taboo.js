// Tabú (Palabras Prohibidas) Game Engine

export const TABOO_CARDS = [
  { word: 'PLAYA', forbidden: ['Arena', 'Mar', 'Sol', 'Verano', 'Vacaciones'] },
  { word: 'FÚTBOL', forbidden: ['Pelota', 'Gol', 'Cancha', 'Jugador', 'Equipo'] },
  { word: 'PIZZA', forbidden: ['Queso', 'Masa', 'Horno', 'Tomate', 'Italiana'] },
  { word: 'HOSPITAL', forbidden: ['Médico', 'Enfermo', 'Ambulancia', 'Cura', 'Doctor'] },
  { word: 'AVIÓN', forbidden: ['Volar', 'Aeropuerto', 'Alas', 'Piloto', 'Cielo'] },
  { word: 'CHOCOLATE', forbidden: ['Dulce', 'Cacao', 'Negro', 'Leche', 'Golosina'] },
  { word: 'CELULAR', forbidden: ['Teléfono', 'Llamar', 'Pantalla', 'WhatsApp', 'Batería'] },
  { word: 'GUITARRA', forbidden: ['Cuerdas', 'Música', 'Tocar', 'Instrumento', 'Acorde'] },
  { word: 'PERRO', forbidden: ['Ladrar', 'Gato', 'Mascota', 'Hueso', 'Cola'] },
  { word: 'CINE', forbidden: ['Película', 'Palomitas', 'Pochoclo', 'Pantalla', 'Actor'] },
  { word: 'RELOJ', forbidden: ['Hora', 'Tiempo', 'Minuto', 'Muñeca', 'Alarma'] },
  { word: 'BICICLETA', forbidden: ['Ruedas', 'Pedales', 'Casco', 'Cadena', 'Pasear'] }
];

export class TabooGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'taboo';
    this.name = 'Tabú';
    this.playerOrder = [];
    this.activePlayerIndex = 0;
    this.phase = 'GET_READY'; // GET_READY | PLAYING | TURN_SUMMARY | FINAL_PODIUM
    this.cardIndex = 0;
    this.shuffledCards = [];
    this.secondsRemaining = 60;
    this.timer = null;
    this.turnScore = 0;
    this.cardsGuessed = [];
    this.cumulativeScores = {};

    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
  }

  start() {
    this.playerOrder = Array.from(this.room.players.keys()).sort(() => 0.5 - Math.random());
    this.activePlayerIndex = 0;
    this.shuffledCards = [...TABOO_CARDS].sort(() => 0.5 - Math.random());
    this.cardIndex = 0;
    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
    this.startTurn();
  }

  startTurn() {
    this.phase = 'GET_READY';
    this.secondsRemaining = 60;
    this.turnScore = 0;
    this.cardsGuessed = [];
    if (this.timer) clearInterval(this.timer);

    this.room.broadcastState();
  }

  startTurnTimer(playerId) {
    if (this.phase !== 'GET_READY') return;
    const activePid = this.playerOrder[this.activePlayerIndex];
    if (playerId !== activePid && playerId !== this.room.hostId) return;

    this.phase = 'PLAYING';
    this.secondsRemaining = 60;
    this.room.broadcastState();

    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('taboo:tick', {
        secondsRemaining: this.secondsRemaining
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.finishTurn();
      }
    }, 1000);
  }

  markGuessed(playerId) {
    if (this.phase !== 'PLAYING') return;
    const activePid = this.playerOrder[this.activePlayerIndex];
    if (playerId !== activePid) return;

    const currentCard = this.getCurrentCard();
    if (currentCard) {
      this.cardsGuessed.push(currentCard.word);
      this.turnScore += 1;
    }

    this.advanceCard();
  }

  markTaboo(playerId) {
    if (this.phase !== 'PLAYING') return;
    const activePid = this.playerOrder[this.activePlayerIndex];
    if (playerId !== activePid) return;

    this.turnScore = Math.max(0, this.turnScore - 1);
    this.advanceCard();
  }

  passCard(playerId) {
    if (this.phase !== 'PLAYING') return;
    const activePid = this.playerOrder[this.activePlayerIndex];
    if (playerId !== activePid) return;

    this.advanceCard();
  }

  advanceCard() {
    this.cardIndex = (this.cardIndex + 1) % this.shuffledCards.length;
    this.room.broadcastState();
  }

  getCurrentCard() {
    return this.shuffledCards[this.cardIndex] || TABOO_CARDS[0];
  }

  finishTurn() {
    this.phase = 'TURN_SUMMARY';
    const activePid = this.playerOrder[this.activePlayerIndex];
    if (activePid) {
      this.cumulativeScores[activePid] = (this.cumulativeScores[activePid] || 0) + this.turnScore;
    }
    this.room.broadcastState();
  }

  nextTurn() {
    this.activePlayerIndex += 1;
    if (this.activePlayerIndex >= this.playerOrder.length) {
      this.phase = 'FINAL_PODIUM';
      this.room.broadcastState();
    } else {
      this.startTurn();
    }
  }

  getStateForPlayer(playerId) {
    const activePid = this.playerOrder[this.activePlayerIndex];
    const isDescriber = playerId === activePid;
    const currentCard = this.getCurrentCard();

    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      activePlayerId: activePid,
      isDescriber,
      secondsRemaining: this.secondsRemaining,
      turnScore: this.turnScore,
      cardsGuessed: this.cardsGuessed,
      // Describer sees the target word and forbidden words
      // Other players see the forbidden words to referee!
      currentCard: currentCard ? {
        word: isDescriber ? currentCard.word : '??? (¡Adivinen!)',
        forbidden: currentCard.forbidden
      } : null,
      cumulativeScores: this.cumulativeScores,
      completedPlayerIds: [activePid]
    };
  }
}
