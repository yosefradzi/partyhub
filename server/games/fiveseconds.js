// 5 Segundos (5 Second Rule) Game Engine

export const FIVE_SECONDS_PROMPTS = [
  'Nombra 3 cosas que encuentras debajo de tu cama',
  'Nombra 3 excusas para cancelar una cita a último momento',
  'Nombra 3 marcas de autos famosas',
  'Nombra 3 animales salvajes que comiencen con la letra L',
  'Nombra 3 comidas rápidas que engordan mucho',
  'Nombra 3 superhéroes que lleven capa',
  'Nombra 3 cosas que huelen delicioso por la mañana',
  'Nombra 3 canciones que te sabes completas de memoria',
  'Nombra 3 cosas que siempre llevas en los bolsillos',
  'Nombra 3 ciudades que empiecen con la letra B',
  'Nombra 3 series de Netflix muy famosas',
  'Nombra 3 cosas que nunca le prestarías a tu vecino',
  'Nombra 3 actores de Hollywood muy famosos',
  'Nombra 3 cosas de color amarillo',
  'Nombra 3 aplicaciones que abres todos los días'
];

export class FiveSecondsGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'fiveseconds';
    this.name = '5 Segundos';
    this.playerOrder = [];
    this.activePlayerIndex = 0;
    this.currentCycle = 1;
    this.totalCycles = options.cycles || 2; // Each player gets 2 turns
    this.phase = 'GET_READY'; // GET_READY | COUNTDOWN | VOTING | TURN_RESULT | FINAL_PODIUM
    this.currentPrompt = '';
    this.usedPrompts = [];
    this.secondsRemaining = 5;
    this.timer = null;
    this.votes = {}; // voterId -> 'YES' | 'NO'
    this.turnApproved = false;
    this.cumulativeScores = {};

    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
  }

  start() {
    this.playerOrder = Array.from(this.room.players.keys()).sort(() => 0.5 - Math.random());
    this.activePlayerIndex = 0;
    this.currentCycle = 1;
    this.usedPrompts = [];
    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
    this.startTurn();
  }

  startTurn() {
    const available = FIVE_SECONDS_PROMPTS.filter(p => !this.usedPrompts.includes(p));
    const pool = available.length > 0 ? available : FIVE_SECONDS_PROMPTS;
    this.currentPrompt = pool[Math.floor(Math.random() * pool.length)];
    this.usedPrompts.push(this.currentPrompt);

    this.phase = 'GET_READY';
    this.secondsRemaining = 5;
    this.votes = {};
    this.turnApproved = false;
    if (this.timer) clearInterval(this.timer);

    this.room.broadcastState();
  }

  startCountdown(playerId) {
    if (this.phase !== 'GET_READY') return;
    const activePid = this.playerOrder[this.activePlayerIndex];
    if (playerId !== activePid && playerId !== this.room.hostId) return;

    this.phase = 'COUNTDOWN';
    this.secondsRemaining = 5;
    this.room.broadcastState();

    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('fiveseconds:tick', {
        secondsRemaining: this.secondsRemaining
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.finishCountdown();
      }
    }, 1000);
  }

  finishCountdown() {
    this.phase = 'VOTING';
    this.votes = {};
    this.room.broadcastState();
  }

  voteTurn(voterId, isApproved) {
    if (this.phase !== 'VOTING') return;
    const activePid = this.playerOrder[this.activePlayerIndex];
    // Active player cannot vote for themselves
    if (voterId === activePid) return;

    this.votes[voterId] = isApproved ? 'YES' : 'NO';
    this.room.broadcastState();

    // Check if all other players voted
    const totalVoters = this.room.players.size - 1;
    if (Object.keys(this.votes).length >= Math.max(totalVoters, 1)) {
      this.finalizeTurn();
    }
  }

  finalizeTurn() {
    this.phase = 'TURN_RESULT';
    const yesVotes = Object.values(this.votes).filter(v => v === 'YES').length;
    const noVotes = Object.values(this.votes).filter(v => v === 'NO').length;

    this.turnApproved = yesVotes >= noVotes;
    const activePid = this.playerOrder[this.activePlayerIndex];

    if (this.turnApproved && activePid) {
      this.cumulativeScores[activePid] = (this.cumulativeScores[activePid] || 0) + 10;
    }

    this.room.broadcastState();
  }

  nextTurn() {
    this.activePlayerIndex += 1;
    if (this.activePlayerIndex >= this.playerOrder.length) {
      this.activePlayerIndex = 0;
      this.currentCycle += 1;
    }

    if (this.currentCycle > this.totalCycles) {
      this.phase = 'FINAL_PODIUM';
      this.room.broadcastState();
    } else {
      this.startTurn();
    }
  }

  getStateForPlayer(playerId) {
    const activePid = this.playerOrder[this.activePlayerIndex];

    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      currentCycle: this.currentCycle,
      totalCycles: this.totalCycles,
      activePlayerId: activePid,
      isMyTurn: playerId === activePid,
      currentPrompt: this.currentPrompt,
      secondsRemaining: this.secondsRemaining,
      votes: this.phase === 'VOTING' || this.phase === 'TURN_RESULT' ? this.votes : {},
      turnApproved: this.turnApproved,
      cumulativeScores: this.cumulativeScores,
      completedPlayerIds: this.phase === 'VOTING' ? Object.keys(this.votes) : (this.phase === 'COUNTDOWN' || this.phase === 'GET_READY' ? [activePid] : [])
    };
  }
}
