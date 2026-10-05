// El Impostor Game Engine

export const IMPOSTOR_WORDS = [
  { category: 'Comida', words: ['Pizza', 'Hamburguesa', 'Sushi', 'Tacos', 'Milanesa', 'Helado', 'Chocolate', 'Empanada', 'Paella', 'Asado'] },
  { category: 'Lugares', words: ['Aeropuerto', 'Hospital', 'Playa', 'Cine', 'Museo', 'Supermercado', 'Hotel', 'Gimnasio', 'Estación de tren', 'Biblioteca'] },
  { category: 'Objetos', words: ['Smartphone', 'Guitarra', 'Bicicleta', 'Microondas', 'Reloj', 'Paraguas', 'Cámara', 'Mochila', 'Lámpara', 'Auriculares'] },
  { category: 'Animales', words: ['Delfín', 'Elefante', 'León', 'Pingüino', 'Koala', 'Canguro', 'Águila', 'Tiburón', 'Perro', 'Gato'] },
  { category: 'Profesiones', words: ['Astronauta', 'Cocinero', 'Bombero', 'Detective', 'Médico', 'Piloto', 'Profesor', 'Fotógrafo', 'Músico', 'Arquitecto'] }
];

export class ImpostorGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'impostor';
    this.name = 'El Impostor';
    this.phase = 'WORD_REVEAL'; // WORD_REVEAL | DISCUSSION | VOTING | REVEAL | GUESS_WORD | ROUND_RESULTS
    this.category = '';
    this.secretWord = '';
    this.impostorIds = [];
    this.votes = {}; // voterId -> targetPlayerId
    this.impostorGuess = '';
    this.discussionSeconds = options.discussionSeconds || 120;
    this.discussionTimer = null;
    this.scores = {};

    for (const pid of this.room.players.keys()) {
      this.scores[pid] = 0;
    }
  }

  start() {
    // Pick random category and word
    const catObj = IMPOSTOR_WORDS[Math.floor(Math.random() * IMPOSTOR_WORDS.length)];
    this.category = catObj.category;
    this.secretWord = catObj.words[Math.floor(Math.random() * catObj.words.length)];

    // Pick 1 impostor (or 2 if >= 6 players)
    const playerIds = Array.from(this.room.players.keys());
    const impostorCount = playerIds.length >= 6 ? 2 : 1;
    this.impostorIds = [];
    
    const shuffled = [...playerIds].sort(() => 0.5 - Math.random());
    this.impostorIds = shuffled.slice(0, impostorCount);

    this.phase = 'WORD_REVEAL';
    this.votes = {};
    this.impostorGuess = '';

    this.room.broadcastState();
  }

  startDiscussion() {
    this.phase = 'DISCUSSION';
    this.room.broadcastState();
  }

  startVoting() {
    this.phase = 'VOTING';
    this.votes = {};
    this.room.broadcastState();
  }

  vote(voterId, targetPlayerId) {
    if (this.phase !== 'VOTING') return;
    this.votes[voterId] = targetPlayerId;
    this.room.broadcastState();

    // If everyone voted, finish voting
    const totalPlayers = this.room.players.size;
    if (Object.keys(this.votes).length >= totalPlayers) {
      this.finalizeVoting();
    }
  }

  finalizeVoting() {
    this.phase = 'REVEAL';
    
    // Count votes
    const voteCounts = {};
    for (const targetId of Object.values(this.votes)) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    let maxVotes = 0;
    let mostVotedId = null;
    let isTie = false;

    for (const [pid, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        mostVotedId = pid;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    }

    this.mostVotedPlayerId = isTie ? null : mostVotedId;
    this.caughtImpostor = this.mostVotedPlayerId && this.impostorIds.includes(this.mostVotedPlayerId);

    // If impostor was caught, give them a chance to guess the secret word
    if (this.caughtImpostor) {
      this.phase = 'GUESS_WORD';
    } else {
      // Impostor escaped! Impostor wins points
      for (const impId of this.impostorIds) {
        this.scores[impId] = (this.scores[impId] || 0) + 15;
      }
      this.phase = 'ROUND_RESULTS';
    }

    this.room.broadcastState();
  }

  submitImpostorGuess(playerId, guess) {
    if (this.phase !== 'GUESS_WORD' || !this.impostorIds.includes(playerId)) return;
    this.impostorGuess = (guess || '').trim();
    
    const normGuess = this.impostorGuess.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normSecret = this.secretWord.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const correct = normGuess === normSecret;
    this.guessCorrect = correct;

    if (correct) {
      // Impostor steals victory!
      for (const impId of this.impostorIds) {
        this.scores[impId] = (this.scores[impId] || 0) + 10;
      }
    } else {
      // Crew members win!
      for (const pid of this.room.players.keys()) {
        if (!this.impostorIds.includes(pid)) {
          this.scores[pid] = (this.scores[pid] || 0) + 10;
        }
      }
    }

    this.phase = 'ROUND_RESULTS';
    this.room.broadcastState();
  }

  getStateForPlayer(playerId) {
    const isImpostor = this.impostorIds.includes(playerId);
    const showWord = this.phase === 'ROUND_RESULTS' || !isImpostor;

    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      category: this.category,
      isImpostor,
      word: showWord ? this.secretWord : null,
      impostors: this.phase === 'ROUND_RESULTS' ? this.impostorIds : null,
      votes: this.phase === 'REVEAL' || this.phase === 'GUESS_WORD' || this.phase === 'ROUND_RESULTS' ? this.votes : (this.votes[playerId] ? { [playerId]: this.votes[playerId] } : {}),
      mostVotedPlayerId: this.mostVotedPlayerId,
      caughtImpostor: this.caughtImpostor,
      guessCorrect: this.guessCorrect,
      impostorGuess: this.impostorGuess,
      scores: this.scores,
      completedPlayerIds: this.phase === 'VOTING' ? Object.keys(this.votes) : []
    };
  }
}
