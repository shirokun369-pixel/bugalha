
import { Player, Enemy } from './types';

export const calculateColumnScore = (column: number[]): number => {
  const counts: Record<number, number> = {};
  column.forEach(val => {
    counts[val] = (counts[val] || 0) + 1;
  });

  let score = 0;
  Object.entries(counts).forEach(([valStr, count]) => {
    const val = parseInt(valStr);
    score += val * (count * count);
  });
  return score;
};

export const calculateTotalScores = (board: number[][]) => {
  const colScores = board.map(calculateColumnScore);
  const total = colScores.reduce((a, b) => a + b, 0);
  return { colScores, total };
};

export const isBoardFull = (board: number[][]): boolean => {
  return board.every(col => col.length === 3);
};

export const getAIBestMove = (
  aiBoard: number[][], 
  playerBoard: number[][], 
  diceValue: number,
  enemy: Enemy
): number => {
  const validCols = aiBoard.map((col, idx) => col.length < 3 ? idx : -1).filter(idx => idx !== -1);
  if (validCols.length === 0) return 0;

  // Nível 0: Aleatório puro
  if (enemy.strategyLevel === 0) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  // Nível 1+: Busca destruir se possível
  const destructionCols = validCols.filter(idx => playerBoard[idx].includes(diceValue));
  if (destructionCols.length > 0 && Math.random() > 0.3) {
    return destructionCols[Math.floor(Math.random() * destructionCols.length)];
  }

  // Nível 2+: Busca combos próprios
  if (enemy.strategyLevel >= 2) {
    const comboCols = validCols.filter(idx => aiBoard[idx].includes(diceValue));
    if (comboCols.length > 0) return comboCols[0];
  }

  // Nível 3: Mestre (Simulação básica de pontuação)
  if (enemy.strategyLevel === 3) {
    let bestCol = validCols[0];
    let maxAdvantage = -999;

    for (const colIdx of validCols) {
      // Simular ganho
      const currentColScore = calculateColumnScore(aiBoard[colIdx]);
      const nextColScore = calculateColumnScore([...aiBoard[colIdx], diceValue]);
      const gain = nextColScore - currentColScore;

      // Simular perda do oponente
      const currentOppScore = calculateColumnScore(playerBoard[colIdx]);
      const nextOppScore = calculateColumnScore(playerBoard[colIdx].filter(d => d !== diceValue));
      const lossToOpp = currentOppScore - nextOppScore;

      const totalAdvantage = gain + lossToOpp;
      if (totalAdvantage > maxAdvantage) {
        maxAdvantage = totalAdvantage;
        bestCol = colIdx;
      }
    }
    return bestCol;
  }

  return validCols[Math.floor(Math.random() * validCols.length)];
};
