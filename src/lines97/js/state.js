// ── Lines 97 — Game State ──
import { SIZE, MAX_UNDO, MAX_HINT } from './constants.js';

export const state = {
  board: [],
  score: 0,
  highScore: 0,
  nextBalls: [],
  selected: null,
  animating: false,
  gameOver: false,
  palette: 'pastel',
  // Undo
  undoStack: [],
  undoLeft: MAX_UNDO,
  // Hint
  hintLeft: MAX_HINT,
  // Stats
  moves: 0,
  ballsCleared: 0,
  longestLine: 0,
  elapsedTime: 0,
  timerInterval: null,
};

/** Deep-clone the saveable parts of state for undo / checkpoint */
export function cloneSnapshot() {
  return {
    board: state.board.map(r => [...r]),
    score: state.score,
    nextBalls: state.nextBalls.map(b => {
      if (typeof b === 'object' && b !== null) {
        return { color: b.color, row: b.row, col: b.col };
      } else {
        return { color: Number(b), row: 0, col: 0 };
      }
    }),
    moves: state.moves,
    ballsCleared: state.ballsCleared,
    longestLine: state.longestLine,
    elapsedTime: state.elapsedTime,
    undoLeft: state.undoLeft,
    hintLeft: state.hintLeft,
  };
}

/** Restore state from a snapshot (undo / checkpoint load) */
export function restoreSnapshot(snap) {
  state.board = snap.board.map(r => [...r]);
  state.score = snap.score;
  state.nextBalls = snap.nextBalls.map(b => {
    if (typeof b === 'object' && b !== null && b.color !== undefined) {
      return { color: b.color, row: b.row !== undefined ? b.row : 0, col: b.col !== undefined ? b.col : 0 };
    } else {
      return { color: Number(b), row: 0, col: 0 };
    }
  });
  state.moves = snap.moves;
  state.ballsCleared = snap.ballsCleared;
  state.longestLine = snap.longestLine;
  state.elapsedTime = snap.elapsedTime;
  if (snap.undoLeft !== undefined) state.undoLeft = snap.undoLeft;
  if (snap.hintLeft !== undefined) state.hintLeft = snap.hintLeft;
  state.selected = null;
  state.gameOver = false;
  state.animating = false;
}

/** Full reset for a new game */
export function resetState() {
  state.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  state.score = 0;
  state.selected = null;
  state.animating = false;
  state.gameOver = false;
  state.undoStack = [];
  state.undoLeft = MAX_UNDO;
  state.hintLeft = MAX_HINT;
  state.moves = 0;
  state.ballsCleared = 0;
  state.longestLine = 0;
  state.elapsedTime = 0;
}
