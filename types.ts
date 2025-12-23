
export type Player = 'PLAYER' | 'AI';
export type Difficulty = 'Fácil' | 'Médio' | 'Difícil' | 'Mestre';

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
  boardAI: number[][];
  currentTurn: Player;
  currentDiceValue: number | null;
  isRolling: boolean;
  winner: Player | 'DRAW' | null;
  currentEnemy: Enemy;
  playerName: string;
  playerAvatar: string | null; // Base64 image
  scores: {
    player: number;
    ai: number;
    playerCols: number[];
    aiCols: number[];
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
  playerName: 'CORDEIRO',
  playerAvatar: null,
  scores: {
    player: 0,
    ai: 0,
    playerCols: [0, 0, 0],
    aiCols: [0, 0, 0]
  }
};
