
export type Player = 'PLAYER' | 'AI' | 'PLAYER2';
export type Difficulty = 'Fácil' | 'Médio' | 'Difícil' | 'Mestre';
export type GameMode = 'AI' | 'LOCAL';

export interface Enemy {
  id: string;
  name: string;
  difficulty: Difficulty;
  avatarColor: string;
  strategyLevel: number; // 0 to 3
}

export const ENEMIES: Enemy[] = [
  { id: 'ratoo', name: 'RATOO', difficulty: 'Fácil', avatarColor: '#a8a29e', strategyLevel: 0 },
  { id: 'klunko', name: 'KLUNKO E BOP', difficulty: 'Médio', avatarColor: '#78716c', strategyLevel: 1 },
  { id: 'shroomy', name: 'SHROOMY', difficulty: 'Difícil', avatarColor: '#ef4444', strategyLevel: 2 },
  { id: 'toww', name: 'O QUE ESPERA', difficulty: 'Mestre', avatarColor: '#ffffff', strategyLevel: 3 },
];

export interface GameState {
  boardPlayer: number[][];
  boardAI: number[][]; // No modo local, este é o tabuleiro do Jogador 2
  currentTurn: Player;
  currentDiceValue: number | null;
  isRolling: boolean;
  winner: Player | 'DRAW' | null;
  currentEnemy: Enemy;
  gameMode: GameMode;
  playerName: string;
  playerAvatar: string | null;
  player2Name: string;
  player2Avatar: string | null;
  scores: {
    player: number;
    ai: number; // No modo local, este é o score do Jogador 2
    playerCols: number[];
    aiCols: number[]; // No modo local, estas são as colunas do Jogador 2
  };
}

export const INITIAL_STATE: GameState = {
  boardPlayer: [[], [], []],
  boardAI: [[], [], []],
  currentTurn: 'PLAYER',
  currentDiceValue: null,
  isRolling: false,
  winner: null,
  currentEnemy: ENEMIES[1],
  gameMode: 'AI',
  playerName: 'CORDEIRO',
  playerAvatar: null,
  player2Name: 'HEREGE',
  player2Avatar: null,
  scores: {
    player: 0,
    ai: 0,
    playerCols: [0, 0, 0],
    aiCols: [0, 0, 0]
  }
};
