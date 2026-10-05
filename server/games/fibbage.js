// Cazador de Mentiras (Fibbage / Bluff) Game Engine

export const FIBBAGE_FACTS = [
  {
    question: 'En 2018, un hombre en Suiza fue multado por pasear a su ________ por la calle sin permiso.',
    truth: 'Camello',
    category: 'Leyes insólitas'
  },
  {
    question: 'En el siglo XIX, el kétchup se vendía en farmacias como medicina para curar ________.',
    truth: 'La diarrea',
    category: 'Historia médica'
  },
  {
    question: 'En la antigua Roma, muchas personas adineradas utilizaban orina humana como ________.',
    truth: 'Enjuague bucal',
    category: 'Curiosidades históricas'
  },
  {
    question: 'El inventor del Frisbee, Ed Headrick, pidió que al morir sus cenizas fueran convertidas en ________.',
    truth: 'Un frisbee',
    category: 'Inventos locos'
  },
  {
    question: 'En Australia existió una ley que prohibía llevar puesto ________ los domingos después del mediodía.',
    truth: 'Pantalones rosas',
    category: 'Leyes extrañas'
  },
  {
    question: 'En 2013, un banco en Alemania transfirió por error 222 millones de euros porque el empleado ________.',
    truth: 'Se durmió sobre el teclado',
    category: 'Errores millonarios'
  },
  {
    question: 'En Canadá, es ilegal pagar un artículo que cueste más de diez dólares utilizando únicamente ________.',
    truth: 'Monedas de un centavo',
    category: 'Dinero y finanzas'
  },
  {
    question: 'Para evitar que los soldados desertaran en la Primera Guerra Mundial, los británicos les prometieron ________.',
    truth: 'Cerveza gratis',
    category: 'Historia bélica'
  }
];

export class FibbageGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'fibbage';
    this.name = 'Cazador de Mentiras';
    this.totalRounds = options.rounds || 3;
    this.currentRound = 1;
    this.phase = 'BLUFFING'; // BLUFFING | CHOOSING | REVEAL | FINAL_PODIUM
    this.currentFact = null;
    this.usedFacts = [];
    this.bluffs = {}; // { [playerId]: fakeAnswerText }
    this.choices = []; // [ { id: string, text: string, isTruth: boolean, authorId: string|null } ]
    this.votes = {}; // { [voterId]: choiceId }
    this.roundScores = {}; // { [playerId]: number }
    this.cumulativeScores = {}; // { [playerId]: number }
    this.secondsRemaining = 45;
    this.timer = null;

    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
  }

  start() {
    this.currentRound = 1;
    this.usedFacts = [];
    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
    this.startRound();
  }

  startRound() {
    const available = FIBBAGE_FACTS.filter(f => !this.usedFacts.includes(f.question));
    const pool = available.length > 0 ? available : FIBBAGE_FACTS;
    this.currentFact = pool[Math.floor(Math.random() * pool.length)];
    this.usedFacts.push(this.currentFact.question);

    this.phase = 'BLUFFING';
    this.bluffs = {};
    this.choices = [];
    this.votes = {};
    this.roundScores = {};
    this.secondsRemaining = 45;

    for (const pid of this.room.players.keys()) {
      this.roundScores[pid] = 0;
      this.room.broadcastPlayerProgress(pid, 0);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('fibbage:tick', {
        secondsRemaining: this.secondsRemaining,
        phase: this.phase
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.finishBluffing();
      }
    }, 1000);

    this.room.broadcastState();
  }

  submitBluff(playerId, bluffText) {
    if (this.phase !== 'BLUFFING') return;
    const clean = (bluffText || '').trim();
    if (!clean) return;

    this.bluffs[playerId] = clean;
    this.room.broadcastPlayerProgress(playerId, 1);
    this.room.broadcastState();

    if (Object.keys(this.bluffs).length >= this.room.players.size) {
      if (this.timer) clearInterval(this.timer);
      this.finishBluffing();
    }
  }

  finishBluffing() {
    this.phase = 'CHOOSING';
    this.choices = [];
    this.votes = {};
    this.secondsRemaining = 35;

    // Add truth
    this.choices.push({
      id: 'truth',
      text: this.currentFact.truth,
      isTruth: true,
      authorId: null
    });

    // Add player bluffs
    for (const [pid, text] of Object.entries(this.bluffs)) {
      this.choices.push({
        id: `bluff_${pid}`,
        text: text,
        isTruth: false,
        authorId: pid
      });
    }

    // Shuffle choices
    this.choices = this.choices.sort(() => 0.5 - Math.random());

    for (const pid of this.room.players.keys()) {
      this.room.broadcastPlayerProgress(pid, 0);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('fibbage:tick', {
        secondsRemaining: this.secondsRemaining,
        phase: this.phase
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.evaluateScores();
      }
    }, 1000);

    this.room.broadcastState();
  }

  voteChoice(voterId, choiceId) {
    if (this.phase !== 'CHOOSING') return;
    // Cannot vote for your own bluff
    const choice = this.choices.find(c => c.id === choiceId);
    if (!choice || choice.authorId === voterId) return;

    this.votes[voterId] = choiceId;
    this.room.broadcastPlayerProgress(voterId, 1);
    this.room.broadcastState();

    if (Object.keys(this.votes).length >= this.room.players.size) {
      if (this.timer) clearInterval(this.timer);
      this.evaluateScores();
    }
  }

  evaluateScores() {
    this.phase = 'REVEAL';

    for (const [voterId, choiceId] of Object.entries(this.votes)) {
      const choice = this.choices.find(c => c.id === choiceId);
      if (!choice) continue;

      if (choice.isTruth) {
        // Guessed truth: +10 pts
        this.roundScores[voterId] = (this.roundScores[voterId] || 0) + 10;
        this.cumulativeScores[voterId] = (this.cumulativeScores[voterId] || 0) + 10;
      } else if (choice.authorId) {
        // Fell for a friend's bluff: friend gets +5 pts!
        const liarId = choice.authorId;
        this.roundScores[liarId] = (this.roundScores[liarId] || 0) + 5;
        this.cumulativeScores[liarId] = (this.cumulativeScores[liarId] || 0) + 5;
      }
    }

    this.room.broadcastState();
  }

  nextRound() {
    if (this.currentRound >= this.totalRounds) {
      this.phase = 'FINAL_PODIUM';
      this.room.broadcastState();
      return;
    }
    this.currentRound += 1;
    this.startRound();
  }

  getStateForPlayer(playerId) {
    const completedPlayerIds = this.phase === 'BLUFFING'
      ? Object.keys(this.bluffs)
      : this.phase === 'CHOOSING'
      ? Object.keys(this.votes)
      : [];

    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      question: this.currentFact ? this.currentFact.question : '',
      category: this.currentFact ? this.currentFact.category : '',
      secondsRemaining: this.secondsRemaining,
      hasSubmittedBluff: Boolean(this.bluffs[playerId]),
      myVote: this.votes[playerId] || null,
      hasVoted: Boolean(this.votes[playerId]),
      // In CHOOSING phase, players only see choices (without knowing who authored what or what is truth)
      choices: this.phase === 'CHOOSING' 
        ? this.choices.map(c => ({ id: c.id, text: c.text, isMine: c.authorId === playerId }))
        : (this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM' ? this.choices : null),
      truth: (this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM') && this.currentFact ? this.currentFact.truth : null,
      votes: (this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM') ? this.votes : (this.votes[playerId] ? { [playerId]: this.votes[playerId] } : {}),
      roundScores: this.roundScores,
      cumulativeScores: this.cumulativeScores,
      completedPlayerIds
    };
  }
}
