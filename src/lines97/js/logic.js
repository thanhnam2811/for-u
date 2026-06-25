// ── Lines 97 — Core Game Logic ──
import { SIZE, NUM_COLORS, MIN_LINE, SPAWN_COUNT, INITIAL_SPAWN } from './constants.js';
import { state } from './state.js';

export function getEmptyCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (state.board[r][c] === 0) cells.push({ row: r, col: c });
  return cells;
}

export function findPath(sr, sc, er, ec) {
  if (sr === er && sc === ec) return [{ row: sr, col: sc }];
  if (state.board[er][ec] !== 0) return null;
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const parent = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  visited[sr][sc] = true;
  const queue = [{ row: sr, col: sc }];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  while (queue.length) {
    const cur = queue.shift();
    for (const [dr, dc] of dirs) {
      const nr = cur.row + dr, nc = cur.col + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (visited[nr][nc] || state.board[nr][nc] !== 0) continue;
      visited[nr][nc] = true;
      parent[nr][nc] = cur;
      if (nr === er && nc === ec) {
        const path = [];
        let n = { row: er, col: ec };
        while (n) { path.unshift(n); n = parent[n.row][n.col]; }
        return path;
      }
      queue.push({ row: nr, col: nc });
    }
  }
  return null;
}

export function checkLines(row, col) {
  const color = state.board[row][col];
  if (!color) return [];
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const toRemove = new Set();
  for (const [dr, dc] of dirs) {
    const line = [`${row},${col}`];
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === color) {
      line.push(`${r},${c}`); r += dr; c += dc;
    }
    r = row - dr; c = col - dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === color) {
      line.push(`${r},${c}`); r -= dr; c -= dc;
    }
    if (line.length >= MIN_LINE) line.forEach(k => toRemove.add(k));
  }
  return [...toRemove].map(k => { const [r, c] = k.split(',').map(Number); return { row: r, col: c }; });
}

export function checkAllNewBalls(positions) {
  const all = new Set();
  for (const p of positions) {
    checkLines(p.row, p.col).forEach(x => all.add(`${x.row},${x.col}`));
  }
  return [...all].map(k => { const [r, c] = k.split(',').map(Number); return { row: r, col: c }; });
}

export function calculateScore(count) {
  return count * 2 * (count - 4);
}

export function generateNextBalls() {
  state.nextBalls = [];
  const empties = getEmptyCells();
  for (let i = 0; i < SPAWN_COUNT && i < empties.length; i++) {
    const idx = Math.floor(Math.random() * empties.length);
    const pos = empties.splice(idx, 1)[0];
    state.nextBalls.push({ color: Math.floor(Math.random() * NUM_COLORS) + 1, row: pos.row, col: pos.col });
  }
}

export function spawnBalls(count) {
  if (count === INITIAL_SPAWN) {
    const empties = getEmptyCells();
    for (let i = 0; i < count && empties.length; i++) {
      const idx = Math.floor(Math.random() * empties.length);
      const pos = empties.splice(idx, 1)[0];
      state.board[pos.row][pos.col] = Math.floor(Math.random() * NUM_COLORS) + 1;
    }
  } else {
    const toSpawn = [];
    for (const ball of state.nextBalls) {
      if (ball && typeof ball === 'object' && ball.row !== undefined && ball.col !== undefined && state.board[ball.row][ball.col] === 0) {
        toSpawn.push(ball);
      } else {
        const color = (ball && typeof ball === 'object') ? ball.color : ball;
        const empties = getEmptyCells().filter(e => !toSpawn.some(s => s.row === e.row && s.col === e.col));
        if (empties.length) {
          const pos = empties[Math.floor(Math.random() * empties.length)];
          toSpawn.push({ color: color, row: pos.row, col: pos.col });
        }
      }
    }
    for (const b of toSpawn) state.board[b.row][b.col] = b.color;
  }
}
