import { SIZE } from './constants.js';
import { state } from './state.js';

/**
 * BFS algorithm to find the shortest path from start to end cell.
 * @param {number} startRow 
 * @param {number} startCol 
 * @param {number} endRow 
 * @param {number} endCol 
 * @returns {Array<{row: number, col: number}>|null} Array of path coordinates or null if blocked.
 */
export function findPath(startRow, startCol, endRow, endCol) {
  if (state.board[startRow][startCol] === 0) return null;
  if (state.board[endRow][endCol] !== 0) return null; // Dest must be empty

  const queue = [[{ row: startRow, col: startCol }]];
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  visited[startRow][startCol] = true;

  const dirs = [
    { r: -1, c: 0 },
    { r: 1, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 }
  ];

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current.row === endRow && current.col === endCol) {
      return path;
    }

    for (const dir of dirs) {
      const nr = current.row + dir.r;
      const nc = current.col + dir.c;

      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (!visited[nr][nc] && state.board[nr][nc] === 0) {
          visited[nr][nc] = true;
          queue.push([...path, { row: nr, col: nc }]);
        }
      }
    }
  }

  return null; // Path blocked
}
