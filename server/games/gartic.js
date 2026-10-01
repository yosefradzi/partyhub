// Teléfono Descompuesto (Gartic Phone / Draw & Guess Chain) Game Engine

export class GarticGame {
  constructor(room, options = {}) {
    this.room = room;
    this.id = 'gartic';
    this.name = 'Teléfono Descompuesto';
    this.phase = 'PROMPT_INPUT'; // PROMPT_INPUT | IN_PROGRESS | PRESENTATION
    this.currentStep = 0; // 0: write initial prompt, 1: draw, 2: guess, 3: draw...
    this.totalSteps = 0;
    this.timePerStep = options.timePerStep || 75; // 75s for drawing, 40s for guessing
    this.secondsRemaining = 75;
    this.timer = null;

    // Chains: { [originalAuthorId]: [ { type: 'text'|'drawing', authorId: string, content: string } ] }
    this.chains = {};
    // Player order
    this.playersOrder = [];
    // Current step submissions: { [playerId]: content }
    this.stepSubmissions = {};
    // Presentation phase state
    this.presentationChainIndex = 0;
    this.presentationStepIndex = 0;
  }

  start() {
    this.playersOrder = Array.from(this.room.players.keys());
    // Total steps equals number of players (if <= 6) or min(players.length, 6)
    this.totalSteps = Math.min(this.playersOrder.length, 6);
    this.currentStep = 0;
    this.chains = {};
    this.stepSubmissions = {};
    this.phase = 'PROMPT_INPUT';
    this.secondsRemaining = 45;

    // Initialize chain for each player
    for (const pid of this.playersOrder) {
      this.chains[pid] = [];
    }

    this.startTimer(45, () => this.finishPromptInput());
    this.room.broadcastState();
  }

  startTimer(seconds, onComplete) {
    if (this.timer) clearInterval(this.timer);
    this.secondsRemaining = seconds;

    this.timer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.room.io.to(this.room.code).emit('gartic:tick', {
        secondsRemaining: this.secondsRemaining,
        step: this.currentStep
      });

      if (this.secondsRemaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        onComplete();
      }
    }, 1000);
  }

  submitPrompt(playerId, text) {
    if (this.phase !== 'PROMPT_INPUT') return;
    const cleanText = (text || '').trim() || 'Un marciano bailando tango';
    this.stepSubmissions[playerId] = cleanText;
    this.room.broadcastPlayerProgress(playerId, 1);

    if (Object.keys(this.stepSubmissions).length >= this.playersOrder.length) {
      if (this.timer) clearInterval(this.timer);
      this.finishPromptInput();
    }
  }

  finishPromptInput() {
    // Fill empty submissions with fun fallbacks
    const fallbackPrompts = [
      'Un dinosaurio cocinando pizza',
      'Un gato astronauta en patineta',
      'Un robot jugando al fútbol',
      'Un perro con sombrero de mariachi',
      'Un oso polar tomando sol en la playa',
      'Un pingüino cantando ópera'
    ];

    for (let i = 0; i < this.playersOrder.length; i++) {
      const pid = this.playersOrder[i];
      const text = this.stepSubmissions[pid] || fallbackPrompts[i % fallbackPrompts.length];
      this.chains[pid].push({
        type: 'text',
        authorId: pid,
        content: text
      });
    }

    this.stepSubmissions = {};
    this.phase = 'IN_PROGRESS';
    this.currentStep = 1;
    this.startNextStep();
  }

  // Determine which chain each player works on at step `currentStep`
  getAssignedChainAuthor(playerId, step) {
    const pIndex = this.playersOrder.indexOf(playerId);
    if (pIndex === -1) return null;
    // Shift chain around the circle
    const targetIndex = (pIndex - step + this.playersOrder.length * 10) % this.playersOrder.length;
    return this.playersOrder[targetIndex];
  }

  startNextStep() {
    if (this.currentStep >= this.totalSteps) {
      this.finishGame();
      return;
    }

    this.stepSubmissions = {};
    const isDrawingStep = this.currentStep % 2 === 1;
    const duration = isDrawingStep ? 75 : 40;

    for (const pid of this.playersOrder) {
      this.room.broadcastPlayerProgress(pid, 0);
    }

    this.room.broadcastState();
    this.startTimer(duration, () => this.finishCurrentStep());
  }

  submitStepContent(playerId, content) {
    if (this.phase !== 'IN_PROGRESS') return;
    this.stepSubmissions[playerId] = content;
    this.room.broadcastPlayerProgress(playerId, 1);

    if (Object.keys(this.stepSubmissions).length >= this.playersOrder.length) {
      if (this.timer) clearInterval(this.timer);
      this.finishCurrentStep();
    }
  }

  finishCurrentStep() {
    const isDrawingStep = this.currentStep % 2 === 1;

    for (const pid of this.playersOrder) {
      const chainAuthor = this.getAssignedChainAuthor(pid, this.currentStep);
      if (!chainAuthor) continue;

      let content = this.stepSubmissions[pid];
      if (!content) {
        content = isDrawingStep ? '' : 'Algo muy abstracto';
      }

      this.chains[chainAuthor].push({
        type: isDrawingStep ? 'drawing' : 'text',
        authorId: pid,
        content
      });
    }

    this.currentStep += 1;
    this.startNextStep();
  }

  finishGame() {
    if (this.timer) clearInterval(this.timer);
    this.phase = 'PRESENTATION';
    this.presentationChainIndex = 0;
    this.presentationStepIndex = 0;
    this.room.broadcastState();
  }

  nextPresentationStep() {
    if (this.phase !== 'PRESENTATION') return;
    const currentChainAuthor = this.playersOrder[this.presentationChainIndex];
    const currentChain = this.chains[currentChainAuthor] || [];

    if (this.presentationStepIndex < currentChain.length - 1) {
      this.presentationStepIndex += 1;
    } else {
      // Move to next chain
      if (this.presentationChainIndex < this.playersOrder.length - 1) {
        this.presentationChainIndex += 1;
        this.presentationStepIndex = 0;
      }
    }
    this.room.broadcastState();
  }

  prevPresentationStep() {
    if (this.phase !== 'PRESENTATION') return;
    if (this.presentationStepIndex > 0) {
      this.presentationStepIndex -= 1;
    } else if (this.presentationChainIndex > 0) {
      this.presentationChainIndex -= 1;
      const prevAuthor = this.playersOrder[this.presentationChainIndex];
      this.presentationStepIndex = (this.chains[prevAuthor]?.length || 1) - 1;
    }
    this.room.broadcastState();
  }

  getStateForPlayer(playerId) {
    const isDrawing = this.currentStep % 2 === 1;
    const chainAuthor = this.getAssignedChainAuthor(playerId, this.currentStep);
    let previousItem = null;

    if (chainAuthor && this.chains[chainAuthor] && this.chains[chainAuthor].length > 0) {
      previousItem = this.chains[chainAuthor][this.chains[chainAuthor].length - 1];
    }

    return {
      gameId: this.id,
      name: this.name,
      phase: this.phase,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      secondsRemaining: this.secondsRemaining,
      isDrawing,
      previousItem,
      hasSubmitted: Boolean(this.stepSubmissions[playerId]),
      // Presentation data
      chains: this.phase === 'PRESENTATION' ? this.chains : null,
      presentationChainAuthor: this.phase === 'PRESENTATION' ? this.playersOrder[this.presentationChainIndex] : null,
      presentationChainIndex: this.presentationChainIndex,
      presentationStepIndex: this.presentationStepIndex,
      playersOrder: this.playersOrder
    };
  }
}
