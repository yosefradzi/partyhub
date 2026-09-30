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

export type AnyGameState = TuttiFruttiState | ImpostorState | BombaState;

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  selectedGame: 'tutifruti' | 'impostor' | 'bomba';
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
