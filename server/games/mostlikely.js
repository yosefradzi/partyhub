// ¿Quién es Más Probable Que...? Game Engine (Player-submitted questions)

export const DEFAULT_PROMPTS_FALLBACK = [
  '¿Quién es más probable que se quede dormido en una fiesta?',
  '¿Quién es más probable que termine en la cárcel por una tontería?',
  '¿Quién es más probable que gaste todo su sueldo en algo inútil?',
  '¿Quién es más probable que sobreviva a un apocalipsis zombie?',
  '¿Quién es más probable que llore viendo una película de Disney?',
  '¿Quién es más probable que se olvide el cumpleaños de su mejor amigo?',
  '¿Quién es más probable que se haga famoso en TikTok por accidente?'
];

export class MostLikelyGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'mostlikely';
    this.name = '¿Quién es Más Probable?';
    this.phase = 'SUBMIT_PROMPTS'; // SUBMIT_PROMPTS | VOTING | REVEAL | FINAL_PODIUM
    this.playerPrompts = {}; // { [playerId]: string[] }
    this.questionsQueue = []; // [ { id: string, text: string, authorId: string } ]
    this.currentQuestionIndex = 0;
    this.votes = {}; // { [voterId]: targetPlayerId }
    this.voteCounts = {}; // { [playerId]: count }
    this.mostVotedPlayerId = null;
    this.cumulativeScores = {}; // { [playerId]: number }
    this.timer = null;
    this.secondsRemaining = 30;

    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
  }

  start() {
    this.phase = 'SUBMIT_PROMPTS';
    this.playerPrompts = {};
    this.questionsQueue = [];
    this.currentQuestionIndex = 0;
    this.votes = {};
    this.secondsRemaining = 45;

    for (const pid of this.room.players.keys()) {
      this.playerPrompts[pid] = [];
      this.cumulativeScores[pid] = 0;
      this.room.broadcastPlayerProgress(pid, 0);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('mostlikely:tick', {
        secondsRemaining: this.secondsRemaining,
        phase: this.phase
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.finishPromptSubmission();
      }
    }, 1000);

    this.room.broadcastState();
  }

  submitCustomPrompt(playerId, text) {
    if (this.phase !== 'SUBMIT_PROMPTS') return;
    const cleanText = (text || '').trim();
    if (!cleanText) return;

    if (!this.playerPrompts[playerId]) this.playerPrompts[playerId] = [];
    this.playerPrompts[playerId].push(cleanText);
    this.room.broadcastPlayerProgress(playerId, 1);
    this.room.broadcastState();

    // If all players submitted at least 1 prompt
    const allSubmitted = Array.from(this.room.players.keys()).every(pid => (this.playerPrompts[pid] || []).length >= 1);
    if (allSubmitted) {
      if (this.timer) clearInterval(this.timer);
      this.finishPromptSubmission();
    }
  }

  finishPromptSubmission() {
    this.questionsQueue = [];
    const playerIds = Array.from(this.room.players.keys());

    // Collect all submitted prompts
    for (const pid of playerIds) {
      const prompts = this.playerPrompts[pid] || [];
      prompts.forEach((txt, idx) => {
        let formatted = txt;
        if (!formatted.toLowerCase().startsWith('¿quién') && !formatted.toLowerCase().startsWith('quien')) {
          formatted = `¿Quién es más probable que ${formatted.replace(/^[¿?]/g, '').trim()}?`;
        }
        if (!formatted.endsWith('?')) formatted += '?';

        this.questionsQueue.push({
          id: `${pid}_${idx}`,
          text: formatted,
          authorId: pid
        });
      });
    }

    // If too few prompts, add some fun defaults
    if (this.questionsQueue.length < playerIds.length) {
      DEFAULT_PROMPTS_FALLBACK.forEach((txt, i) => {
        if (this.questionsQueue.length < Math.max(playerIds.length, 4)) {
          this.questionsQueue.push({
            id: `def_${i}`,
            text: txt,
            authorId: null
          });
        }
      });
    }

    // Shuffle questions
    this.questionsQueue = this.questionsQueue.sort(() => 0.5 - Math.random());
    this.currentQuestionIndex = 0;
    this.startQuestionRound();
  }

  startQuestionRound() {
    if (this.currentQuestionIndex >= this.questionsQueue.length) {
      this.phase = 'FINAL_PODIUM';
      this.room.broadcastState();
      return;
    }

    this.phase = 'VOTING';
    this.votes = {};
    this.voteCounts = {};
    this.mostVotedPlayerId = null;
    this.secondsRemaining = 25;

    for (const pid of this.room.players.keys()) {
      this.room.broadcastPlayerProgress(pid, 0);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('game:tick', {
        secondsRemaining: this.secondsRemaining
      });
      this.room.io.to(this.room.code).emit('mostlikely:tick', {
        secondsRemaining: this.secondsRemaining,
        phase: this.phase
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.evaluateVotes();
      }
    }, 1000);

    this.room.broadcastState();
  }

  votePlayer(voterId, targetPlayerId) {
    if (this.phase !== 'VOTING') return;
    this.votes[voterId] = targetPlayerId;
    this.room.broadcastPlayerProgress(voterId, 1);
    this.room.broadcastState();

    if (Object.keys(this.votes).length >= this.room.players.size) {
      if (this.timer) clearInterval(this.timer);
      this.evaluateVotes();
    }
  }

  evaluateVotes() {
    this.phase = 'REVEAL';
    this.voteCounts = {};

    for (const targetId of Object.values(this.votes)) {
      this.voteCounts[targetId] = (this.voteCounts[targetId] || 0) + 1;
    }

    let maxVotes = 0;
    let winnerId = null;
    for (const [pid, count] of Object.entries(this.voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = pid;
      }
    }

    this.mostVotedPlayerId = winnerId;

    // Award points
    if (winnerId) {
      this.cumulativeScores[winnerId] = (this.cumulativeScores[winnerId] || 0) + 10;
    }

    this.room.broadcastState();
  }

  nextQuestion() {
    this.currentQuestionIndex += 1;
    this.startQuestionRound();
  }

  getStateForPlayer(playerId) {
    const currentQ = this.questionsQueue[this.currentQuestionIndex] || null;
    const completedPlayerIds = this.phase === 'SUBMIT_PROMPTS'
      ? Object.keys(this.playerPrompts).filter(pid => (this.playerPrompts[pid] || []).length > 0)
      : this.phase === 'VOTING'
      ? Object.keys(this.votes)
      : [];

    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questionsQueue.length,
      currentQuestion: currentQ ? currentQ.text : null,
      questionAuthorId: currentQ ? currentQ.authorId : null,
      secondsRemaining: this.secondsRemaining,
      hasSubmittedPrompt: Boolean((this.playerPrompts[playerId] || []).length > 0),
      myVote: this.votes[playerId] || null,
      hasVoted: Boolean(this.votes[playerId]),
      // In REVEAL or FINAL_PODIUM: show all votes and breakdown
      votes: this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM' ? this.votes : (this.votes[playerId] ? { [playerId]: this.votes[playerId] } : {}),
      voteCounts: this.phase === 'REVEAL' || this.phase === 'FINAL_PODIUM' ? this.voteCounts : {},
      mostVotedPlayerId: this.mostVotedPlayerId,
      cumulativeScores: this.cumulativeScores,
      completedPlayerIds
    };
  }
}
