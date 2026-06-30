import { SIZE } from './constants.js';

export const state = {
  board: [],
  score: 0,
  highScore: 0,
  nextBalls: [],
  selected: null,
  animating: false,
  gameOver: false,
  theme: 'classic',
  soundEnabled: true,
  
  // Game metrics
  turn: 0,
  ballsCleared: 0,
  longestLine: 0,
  elapsedTime: 0,
  timerInterval: null,
  
  // RNG seed tracing
  seed: 0,
  initialSeed: 0,
  
  // Event stream replay & Undo
  undoStack: [], // Array of previous states for consecutive max-1 undo
};

/** Deep-clone the saveable part of GameState */
export function cloneSnapshot() {
  return {
    board: state.board.map(r => [...r]),
    score: state.score,
    nextBalls: state.nextBalls.map(b => ({ color: b.color, row: b.row, col: b.col })),
    turn: state.turn,
    ballsCleared: state.ballsCleared,
    longestLine: state.longestLine,
    elapsedTime: state.elapsedTime,
    seed: state.seed,
    initialSeed: state.initialSeed,
  };
}

/** Restore state from a snapshot */
export function restoreSnapshot(snap) {
  state.board = snap.board.map(r => [...r]);
  state.score = snap.score;
  state.nextBalls = snap.nextBalls.map(b => ({ color: b.color, row: b.row, col: b.col }));
  state.turn = snap.turn;
  state.ballsCleared = snap.ballsCleared;
  state.longestLine = snap.longestLine;
  state.elapsedTime = snap.elapsedTime;
  state.seed = snap.seed;
  state.initialSeed = snap.initialSeed;
  
  state.selected = null;
  state.gameOver = false;
  state.animating = false;
}

/** Full reset for a new game */
export function resetState(seed = 0) {
  state.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  state.score = 0;
  state.nextBalls = [];
  state.selected = null;
  state.animating = false;
  state.gameOver = false;
  state.turn = 0;
  state.ballsCleared = 0;
  state.longestLine = 0;
  state.elapsedTime = 0;
  state.seed = seed;
  state.initialSeed = seed;
  state.undoStack = [];
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}
