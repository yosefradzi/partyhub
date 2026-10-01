// Mente Colectiva (Hivemind) Game Engine

export const HIVEMIND_QUESTIONS = [
  'Una película clásica de terror que todos conocen',
  'Un ingrediente para pizza que genera mucha polémica',
  'Una excusa típica para llegar tarde al trabajo o la escuela',
  'Un superhéroe que casi cualquier persona puede nombrar',
  'Un sabor de helado que nunca falta en una heladería',
  'Un animal que la gente suele tener de mascota',
  'Una serie de televisión que casi todos tus amigos vieron',
  'Un país famoso por su comida deliciosa',
  'Un objeto que siempre llevas contigo al salir de casa',
  'Una canción en español que todos cantan en una fiesta',
  'Un deporte olímpico muy popular',
  'Una fruta de color rojo',
  'Un villano legendario del cine',
  'Un juego de mesa clásico para jugar en familia',
  'Una profesión respetada por todo el mundo'
];

export class HivemindGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'hivemind';
    this.name = 'Mente Colectiva';
    this.totalRounds = options.rounds || 4;
    this.currentRound = 1;
    this.phase = 'THINKING'; // THINKING | REVEAL | FINAL_PODIUM
    this.currentQuestion = '';
    this.submissions = {}; // { [playerId]: rawAnswer }
    this.clusters = []; // [ { normalized: string, rawSample: string, playerIds: string[], count: number, points: number } ]
    this.roundScores = {}; // { [playerId]: number }
    this.cumulativeScores = {}; // { [playerId]: number }
    this.usedQuestions = [];
    this.secondsRemaining = 45;
    this.timer = null;

    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
  }

  start() {
    this.currentRound = 1;
    this.usedQuestions = [];
    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
    this.startRound();
  }

  startRound() {
    const available = HIVEMIND_QUESTIONS.filter(q => !this.usedQuestions.includes(q));
    const pool = available.length > 0 ? available : HIVEMIND_QUESTIONS;
    this.currentQuestion = pool[Math.floor(Math.random() * pool.length)];
    this.usedQuestions.push(this.currentQuestion);

    this.phase = 'THINKING';
    this.submissions = {};
    this.clusters = [];
    this.roundScores = {};
    this.secondsRemaining = 45;

    for (const pid of this.room.players.keys()) {
      this.roundScores[pid] = 0;
      this.room.broadcastPlayerProgress(pid, 0);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('hivemind:tick', {
        secondsRemaining: this.secondsRemaining
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.evaluateRound();
      }
    }, 1000);

    this.room.broadcastState();
  }

  submitAnswer(playerId, answer) {
    if (this.phase !== 'THINKING') return;
    this.submissions[playerId] = (answer || '').trim();
    this.room.broadcastPlayerProgress(playerId, 1);

    if (Object.keys(this.submissions).length >= this.room.players.size) {
      if (this.timer) clearInterval(this.timer);
      this.evaluateRound();
    }
  }

  normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  evaluateRound() {
    this.phase = 'REVEAL';
    const clusterMap = new Map(); // normalized -> { rawSample, playerIds }

    for (const [pid, raw] of Object.entries(this.submissions)) {
      const norm = this.normalize(raw);
      if (!norm) continue;

      if (!clusterMap.has(norm)) {
        clusterMap.set(norm, {
          normalized: norm,
          rawSample: raw,
          playerIds: [pid]
        });
      } else {
        clusterMap.get(norm).playerIds.push(pid);
      }
    }

    // Convert to array and sort descending by group size
    const list = Array.from(clusterMap.values()).map(c => ({
      ...c,
      count: c.playerIds.length,
      points: 0
    })).sort((a, b) => b.count - a.count);

    if (list.length > 0) {
      const maxCount = list[0].count;
      // If majority (>= 2 players agreed or single player if only 1 player playing)
      for (const item of list) {
        if (item.count === maxCount && item.count > 1) {
          item.points = 10;
        } else if (item.count > 1) {
          item.points = 5;
        } else {
          item.points = 0;
        }

        for (const pid of item.playerIds) {
          this.roundScores[pid] = item.points;
          this.cumulativeScores[pid] = (this.cumulativeScores[pid] || 0) + item.points;
        }
      }
    }

    this.clusters = list;
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
    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentQuestion: this.currentQuestion,
      secondsRemaining: this.secondsRemaining,
      myAnswer: this.submissions[playerId] || '',
      hasSubmitted: Boolean(this.submissions[playerId]),
      clusters: this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM' ? this.clusters : null,
      submissions: this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM' ? this.submissions : null,
      roundScores: this.roundScores,
      cumulativeScores: this.cumulativeScores
    };
  }
}
