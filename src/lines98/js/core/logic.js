import { SIZE, NUM_COLORS, MIN_LINE, SPAWN_COUNT, INITIAL_SPAWN } from './constants.js';
import { state } from './state.js';
import { SeededRNG } from './rng.js';

export function getEmptyCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r][c] === 0) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

export function getRNG() {
  return new SeededRNG(state.seed);
}

export function saveRNG(rng) {
  state.seed = rng.saveState();
}

/**
 * Scan for lines passing through a specific cell.
 * @returns {Array<{row: number, col: number}>} Coordinates of matched balls.
 */
export function checkLines(row, col, targetLength = MIN_LINE) {
  const color = state.board[row][col];
  if (!color) return [];

  const dirs = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1]   // diagonal down-left
  ];
  
  const toRemove = new Set();

  for (const [dr, dc] of dirs) {
    const line = [`${row},${col}`];
    
    // Positive direction
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === color) {
      line.push(`${r},${c}`);
      r += dr;
      c += dc;
    }

    // Negative direction
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === color) {
      line.push(`${r},${c}`);
      r -= dr;
      c -= dc;
    }

    if (line.length >= targetLength) {
      line.forEach(k => toRemove.add(k));
    }
  }

  return [...toRemove].map(k => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  });
}

/**
 * Checks all lines for newly placed balls.
 */
export function checkAllNewBalls(positions) {
  const all = new Set();
  for (const p of positions) {
    checkLines(p.row, p.col).forEach(x => all.add(`${x.row},${x.col}`));
  }
  return [...all].map(k => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  });
}

export function calculateScore(count) {
  // Original Lines 98 formula: 5 -> 10, 6 -> 18, 7 -> 28, 8 -> 40, 9 -> 54
  return count * 2 * (count - 4);
}

/**
 * Generate 3 random next balls.
 */
export function generateNextBalls() {
  state.nextBalls = [];
  const empties = getEmptyCells();
  const rng = getRNG();

  for (let i = 0; i < SPAWN_COUNT && i < empties.length; i++) {
    const idx = rng.nextInt(0, empties.length);
    const pos = empties.splice(idx, 1)[0];
    const color = rng.nextInt(1, NUM_COLORS + 1);
    state.nextBalls.push({ color, row: pos.row, col: pos.col });
  }

  saveRNG(rng);
}

/**
 * Spawn the actual balls onto the board.
 * @returns {Array<Array<number>>} List of spawned balls as [row, col, color].
 */
export function spawnBalls(count) {
  const rng = getRNG();
  const spawned = [];

  if (count === INITIAL_SPAWN) {
    const empties = getEmptyCells();
    for (let i = 0; i < count && empties.length > 0; i++) {
      const idx = rng.nextInt(0, empties.length);
      const pos = empties.splice(idx, 1)[0];
      const color = rng.nextInt(1, NUM_COLORS + 1);
      state.board[pos.row][pos.col] = color;
      spawned.push([pos.row, pos.col, color]);
    }
  } else {
    const toSpawn = [];
    for (const ball of state.nextBalls) {
      if (state.board[ball.row][ball.col] === 0) {
        toSpawn.push(ball);
      } else {
        const empties = getEmptyCells().filter(
          e => !toSpawn.some(s => s.row === e.row && s.col === e.col)
        );
        if (empties.length > 0) {
          const idx = rng.nextInt(0, empties.length);
          const pos = empties[idx];
          toSpawn.push({ color: ball.color, row: pos.row, col: pos.col });
        }
      }
    }
    for (const b of toSpawn) {
      state.board[b.row][b.col] = b.color;
      spawned.push([b.row, b.col, b.color]);
    }
  }

  saveRNG(rng);
  return spawned;
}

/**
 * Evaluates the move quality.
 * Returns: "Excellent", "Good", "Risky".
 */
export function analyzeMove(fromRow, fromCol, toRow, toCol, clearsCount) {
  if (clearsCount > 0) return 'Excellent';

  const boardOccupancy = (SIZE * SIZE - getEmptyCells().length) / (SIZE * SIZE);

  // Check if move blocks a future spawn cell
  const blocksFutureSpawn = state.nextBalls.some(b => b.row === toRow && b.col === toCol);
  if (blocksFutureSpawn && boardOccupancy > 0.6) {
    return 'Risky';
  }

  // Temporary simulate move to check if it sets up a 4-in-a-row
  const color = state.board[toRow][toCol];
  const potentials = checkLines(toRow, toCol, 4);
  if (potentials.length >= 4) {
    return 'Excellent'; // Setup potential line
  }

  if (boardOccupancy > 0.85) {
    return 'Risky';
  }

  return 'Good';
}
