// Tutti Frutti (Basta / Stop / Scattergories) Game Engine

export const DEFAULT_CATEGORIES = [
  'Nombre o Apodo',
  'País, Ciudad o Lugar',
  'Animal',
  'Fruta o Comida',
  'Cosa u Objeto',
  'Color o Marca'
];

export const ALL_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'
];

export class TuttiFruttiGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'tutifruti';
    this.name = 'Tutti Frutti';
    this.totalRounds = options.rounds || 3;
    this.currentRound = 1;
    this.categories = options.categories || [...DEFAULT_CATEGORIES];
    this.usedLetters = [];
    this.currentLetter = '';
    this.phase = 'LETTER_SPIN'; // LETTER_SPIN | PLAYING | COUNTDOWN_STOP | VOTING | ROUND_RESULTS | FINAL_PODIUM
    this.stopCaller = null;
    this.countdownTimer = null;
    this.countdownSeconds = 3;
    this.reviewCategoryIndex = 0;
    
    // Submissions: { [playerId]: { [category]: string } }
    this.submissions = {};
    // Review votes: { [`${playerId}_${categoryIndex}`]: { valid: boolean, votesAgainst: string[] } }
    this.reviews = {};
    // Round scores: { [playerId]: { total: number, breakdown: { [category]: number } } }
    this.roundScores = {};
    // Cumulative scores across rounds: { [playerId]: number }
    this.cumulativeScores = {};

    // Initialize player cumulative scores
    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
  }

  start() {
    this.currentRound = 1;
    this.usedLetters = [];
    for (const pid of this.room.players.keys()) {
      this.cumulativeScores[pid] = 0;
    }
    this.startRound();
  }

  startRound() {
    // Pick letter not used yet
    const availableLetters = ALL_LETTERS.filter(l => !this.usedLetters.includes(l));
    const lettersPool = availableLetters.length > 0 ? availableLetters : ALL_LETTERS;
    const letter = lettersPool[Math.floor(Math.random() * lettersPool.length)];
    this.currentLetter = letter;
    this.usedLetters.push(letter);

    this.phase = 'LETTER_SPIN';
    this.stopCaller = null;
    this.reviewCategoryIndex = 0;
    this.submissions = {};
    this.reviews = {};
    this.roundScores = {};
    this.countdownSeconds = 3;
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    for (const pid of this.room.players.keys()) {
      this.submissions[pid] = {};
      this.roundScores[pid] = { total: 0, breakdown: {} };
    }

    // Emit letter reveal after 3 seconds of suspense
    setTimeout(() => {
      if (this.phase === 'LETTER_SPIN') {
        this.phase = 'PLAYING';
        this.room.broadcastState();
      }
    }, 3200);

    this.room.broadcastState();
  }

  handlePlayerInput(playerId, data) {
    if (this.phase !== 'PLAYING' && this.phase !== 'COUNTDOWN_STOP') return;
    const { category, value } = data;
    if (!this.submissions[playerId]) this.submissions[playerId] = {};
    this.submissions[playerId][category] = (value || '').trim();
    
    // Broadcast progress indicator (e.g. how many categories filled) without revealing answers yet
    this.room.broadcastPlayerProgress(playerId, Object.keys(this.submissions[playerId]).filter(k => !!this.submissions[playerId][k]).length);
  }

  handleCallStop(playerId) {
    if (this.phase !== 'PLAYING') return;
    
    const player = this.room.players.get(playerId);
    if (!player) return;

    this.phase = 'COUNTDOWN_STOP';
    this.stopCaller = { id: playerId, name: player.name, avatar: player.avatar };
    this.countdownSeconds = 3;

    this.room.broadcastState();

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds -= 1;
      this.room.io.to(this.room.code).emit('tutifruti:countdown', {
        seconds: this.countdownSeconds,
        caller: this.stopCaller
      });

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.finishPlayingPhase();
      }
    }, 1000);
  }

  finishPlayingPhase() {
    this.phase = 'VOTING';
    this.reviewCategoryIndex = 0;
    this.calculateInitialReviews();
    this.room.broadcastState();
  }

  normalizeText(txt) {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  calculateInitialReviews() {
    this.reviews = {};
    const letter = this.normalizeText(this.currentLetter);

    // Group answers by category to detect duplicates
    for (let cIdx = 0; cIdx < this.categories.length; cIdx++) {
      const cat = this.categories[cIdx];
      const answersMap = new Map(); // normalizedAnswer -> array of playerIds

      for (const [pid, playerAnswers] of Object.entries(this.submissions)) {
        const raw = (playerAnswers[cat] || '').trim();
        const norm = this.normalizeText(raw);
        const reviewKey = `${pid}_${cIdx}`;

        // Validation rule 1: Must not be empty
        // Validation rule 2: Must start with the current round letter
        const startsWithLetter = norm.startsWith(letter);
        const isValid = raw.length > 0 && startsWithLetter;

        this.reviews[reviewKey] = {
          raw,
          normalized: norm,
          category: cat,
          playerId: pid,
          valid: isValid,
          isDuplicate: false,
          points: 0,
          disputedVotes: []
        };

        if (isValid) {
          if (!answersMap.has(norm)) {
            answersMap.set(norm, []);
          }
          answersMap.get(norm).push(pid);
        }
      }

      // Check duplicates
      for (const [normAns, pids] of answersMap.entries()) {
        if (pids.length > 1) {
          // Repeated answer: 5 points each
          for (const pid of pids) {
            const reviewKey = `${pid}_${cIdx}`;
            this.reviews[reviewKey].isDuplicate = true;
            this.reviews[reviewKey].points = 5;
          }
        } else if (pids.length === 1) {
          // Unique valid answer: 10 points
          const pid = pids[0];
          const reviewKey = `${pid}_${cIdx}`;
          this.reviews[reviewKey].points = 10;
        }
      }
    }
  }

  toggleAnswerValidation(playerId, targetReviewKey) {
    // Only during VOTING phase
    if (this.phase !== 'VOTING') return;
    const review = this.reviews[targetReviewKey];
    if (!review) return;

    // Toggle valid / invalid
    review.valid = !review.valid;

    // Recalculate points for this item
    if (!review.valid) {
      review.points = 0;
    } else {
      review.points = review.isDuplicate ? 5 : 10;
    }

    this.room.broadcastState();
  }

  finalizeVoting() {
    if (this.phase !== 'VOTING') return;

    // Compute round scores
    for (const pid of this.room.players.keys()) {
      let roundTotal = 0;
      const breakdown = {};

      for (let cIdx = 0; cIdx < this.categories.length; cIdx++) {
        const cat = this.categories[cIdx];
        const reviewKey = `${pid}_${cIdx}`;
        const rev = this.reviews[reviewKey];
        const pts = (rev && rev.valid) ? rev.points : 0;
        breakdown[cat] = pts;
        roundTotal += pts;
      }

      this.roundScores[pid] = { total: roundTotal, breakdown };
      this.cumulativeScores[pid] = (this.cumulativeScores[pid] || 0) + roundTotal;
    }

    if (this.currentRound >= this.totalRounds) {
      this.phase = 'FINAL_PODIUM';
    } else {
      this.phase = 'ROUND_RESULTS';
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

  setReviewCategory(categoryIndex) {
    if (this.phase !== 'VOTING') return;
    const idx = Math.max(0, Math.min(this.categories.length - 1, Number(categoryIndex) || 0));
    this.reviewCategoryIndex = idx;
    this.room.broadcastState();
  }

  nextReviewCategory() {
    if (this.phase !== 'VOTING') return;
    if (this.reviewCategoryIndex < this.categories.length - 1) {
      this.reviewCategoryIndex += 1;
      this.room.broadcastState();
    }
  }

  getStateForPlayer(playerId) {
    return {
      gameId: this.id,
      name: this.name,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      categories: this.categories,
      currentLetter: this.currentLetter,
      phase: this.phase,
      stopCaller: this.stopCaller,
      countdownSeconds: this.countdownSeconds,
      reviewCategoryIndex: this.reviewCategoryIndex,
      // In PLAYING phase, each player only sees their own draft inputs
      mySubmissions: this.submissions[playerId] || {},
      // In VOTING, ROUND_RESULTS and FINAL_PODIUM, everyone sees all submissions & reviews
      allSubmissions: (this.phase === 'VOTING' || this.phase === 'ROUND_RESULTS' || this.phase === 'FINAL_PODIUM') ? this.submissions : null,
      reviews: (this.phase === 'VOTING' || this.phase === 'ROUND_RESULTS' || this.phase === 'FINAL_PODIUM') ? this.reviews : null,
      roundScores: this.roundScores,
      cumulativeScores: this.cumulativeScores
    };
  }
}
