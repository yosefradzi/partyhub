export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
  progress?: number;
}

export interface RoomSettings {
  rounds: number;
  roundDuration: number;
  customCategories?: string[];
}

export interface TuttiFruttiReviewItem {
  raw: string;
  normalized: string;
  category: string;
  playerId: string;
  valid: boolean;
  isDuplicate: boolean;
  points: number;
  disputedVotes: string[];
}

export interface TuttiFruttiState {
  gameId: 'tutifruti';
  name: string;
  currentRound: number;
  totalRounds: number;
  categories: string[];
  currentLetter: string;
  phase: 'LETTER_SPIN' | 'PLAYING' | 'COUNTDOWN_STOP' | 'VOTING' | 'ROUND_RESULTS' | 'FINAL_PODIUM';
  stopCaller: { id: string; name: string; avatar: string } | null;
  countdownSeconds: number;
  mySubmissions: Record<string, string>;
  allSubmissions: Record<string, Record<string, string>> | null;
  reviews: Record<string, TuttiFruttiReviewItem> | null;
  roundScores: Record<string, { total: number; breakdown: Record<string, number> }>;
  cumulativeScores: Record<string, number>;
}

export interface ImpostorState {
  gameId: 'impostor';
  name: string;
  phase: 'WORD_REVEAL' | 'DISCUSSION' | 'VOTING' | 'REVEAL' | 'GUESS_WORD' | 'ROUND_RESULTS';
  category: string;
  isImpostor: boolean;
  word: string | null;
  impostors: string[] | null;
  votes: Record<string, string>;
  mostVotedPlayerId: string | null;
  caughtImpostor: boolean;
  guessCorrect?: boolean;
  impostorGuess?: string;
  scores: Record<string, number>;
}

export interface BombaState {
  gameId: 'bomba';
  name: string;
  phase: 'PLAYING' | 'EXPLODED' | 'GAME_OVER';
  currentSyllable: string;
  activePlayerId: string | null;
  secondsRemaining: number;
  lives: Record<string, number>;
  loserId: string | null;
  winnerId: string | null;
  isMyTurn: boolean;
  usedWordsCount: number;
}

export type GameId = 'tutifruti' | 'impostor' | 'bomba' | 'gartic' | 'hivemind' | 'mostlikely' | 'fibbage' | 'fiveseconds' | 'taboo';

export interface GarticItem {
  type: 'text' | 'drawing';
  authorId: string;
  content: string;
}

export interface GarticState {
  gameId: 'gartic';
  name: string;
  phase: 'PROMPT_INPUT' | 'IN_PROGRESS' | 'PRESENTATION';
  currentStep: number;
  totalSteps: number;
  secondsRemaining: number;
  isDrawing: boolean;
  previousItem: GarticItem | null;
  hasSubmitted: boolean;
  chains: Record<string, GarticItem[]> | null;
  presentationChainAuthor: string | null;
  presentationChainIndex: number;
  presentationStepIndex: number;
  playersOrder: string[];
}

export interface HivemindCluster {
  normalized: string;
  rawSample: string;
  playerIds: string[];
  count: number;
  points: number;
}

export interface HivemindState {
  gameId: 'hivemind';
  name: string;
  phase: 'THINKING' | 'REVEAL' | 'FINAL_PODIUM';
  currentRound: number;
  totalRounds: number;
  currentQuestion: string;
  secondsRemaining: number;
  myAnswer: string;
  hasSubmitted: boolean;
  clusters: HivemindCluster[] | null;
  submissions: Record<string, string> | null;
  roundScores: Record<string, number>;
  cumulativeScores: Record<string, number>;
}

export interface MostLikelyState {
  gameId: 'mostlikely';
  name: string;
  phase: 'SUBMIT_PROMPTS' | 'VOTING' | 'REVEAL' | 'FINAL_PODIUM';
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: string | null;
  questionAuthorId: string | null;
  secondsRemaining: number;
  hasSubmittedPrompt: boolean;
  myVote: string | null;
  hasVoted: boolean;
  votes: Record<string, string>;
  voteCounts: Record<string, number>;
  mostVotedPlayerId: string | null;
  cumulativeScores: Record<string, number>;
}

export interface FibbageChoice {
  id: string;
  text: string;
  isMine?: boolean;
  isTruth?: boolean;
  authorId?: string | null;
}

export interface FibbageState {
  gameId: 'fibbage';
  name: string;
  phase: 'BLUFFING' | 'CHOOSING' | 'REVEAL' | 'FINAL_PODIUM';
  currentRound: number;
  totalRounds: number;
  question: string;
  category: string;
  secondsRemaining: number;
  hasSubmittedBluff: boolean;
  myVote: string | null;
  hasVoted: boolean;
  choices: FibbageChoice[] | null;
  truth: string | null;
  votes: Record<string, string>;
  roundScores: Record<string, number>;
  cumulativeScores: Record<string, number>;
}

export interface FiveSecondsState {
  gameId: 'fiveseconds';
  name: string;
  phase: 'GET_READY' | 'COUNTDOWN' | 'VOTING' | 'TURN_RESULT' | 'FINAL_PODIUM';
  currentCycle: number;
  totalCycles: number;
  activePlayerId: string | null;
  isMyTurn: boolean;
  currentPrompt: string;
  secondsRemaining: number;
  votes: Record<string, 'YES' | 'NO'>;
  turnApproved: boolean;
  cumulativeScores: Record<string, number>;
}

export interface TabooState {
  gameId: 'taboo';
  name: string;
  phase: 'GET_READY' | 'PLAYING' | 'TURN_SUMMARY' | 'FINAL_PODIUM';
  activePlayerId: string | null;
  isDescriber: boolean;
  secondsRemaining: number;
  turnScore: number;
  cardsGuessed: string[];
  currentCard: { word: string; forbidden: string[] } | null;
  cumulativeScores: Record<string, number>;
}

export type AnyGameState = 
  | TuttiFruttiState 
  | ImpostorState 
  | BombaState 
  | GarticState 
  | HivemindState 
  | MostLikelyState 
  | FibbageState 
  | FiveSecondsState 
  | TabooState;

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  selectedGame: GameId;
  status: 'LOBBY' | 'PLAYING';
  settings: RoomSettings;
  gameState: AnyGameState | null;
}

export interface ReactionEvent {
  id: string;
  playerId: string;
  playerName: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  text: string;
  timestamp: number;
}
