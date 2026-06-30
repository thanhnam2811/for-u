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
  totalLinesCleared: 0,
  longestLine: 0,
  elapsedTime: 0,
  timerInterval: null,
  
  // RNG seed tracing
  seed: 0,
  initialSeed: 0,
  
  // Event stream replay & Undo
  undoStack: [], // Array of previous states for consecutive max-1 undo

  // ── Daily Challenge ──
  challenge: {
    active: false,
    dateStr: '',
    goals: [
      { key: 'moves', label: 'Sống sót 60 nước', target: 60, progress: 0, done: false },
      { key: 'score', label: 'Đạt 3000 điểm', target: 3000, progress: 0, done: false },
      { key: 'cleared', label: 'Xoá 25 đợt', target: 25, progress: 0, done: false },
    ],
    completed: false,
  },
};

/** Deep-clone the saveable part of GameState */
export function cloneSnapshot() {
  return {
    board: state.board.map(r => [...r]),
    score: state.score,
    nextBalls: state.nextBalls.map(b => ({ color: b.color, row: b.row, col: b.col })),
    turn: state.turn,
    ballsCleared: state.ballsCleared,
    totalLinesCleared: state.totalLinesCleared,
    longestLine: state.longestLine,
    elapsedTime: state.elapsedTime,
    seed: state.seed,
    initialSeed: state.initialSeed,
    challenge: JSON.parse(JSON.stringify(state.challenge)),
  };
}

/** Restore state from a snapshot */
export function restoreSnapshot(snap) {
  state.board = snap.board.map(r => [...r]);
  state.score = snap.score;
  state.nextBalls = snap.nextBalls.map(b => ({ color: b.color, row: b.row, col: b.col }));
  state.turn = snap.turn;
  state.ballsCleared = snap.ballsCleared;
  state.totalLinesCleared = snap.totalLinesCleared || 0;
  state.longestLine = snap.longestLine;
  state.elapsedTime = snap.elapsedTime;
  state.seed = snap.seed;
  state.initialSeed = snap.initialSeed;
  
  state.selected = null;
  state.gameOver = false;
  state.animating = false;

  if (snap.challenge) {
    state.challenge = JSON.parse(JSON.stringify(snap.challenge));
  }
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
  state.totalLinesCleared = 0;
  state.longestLine = 0;
  state.elapsedTime = 0;
  state.seed = seed;
  state.initialSeed = seed;
  state.undoStack = [];
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  // Reset challenge (preserve goals structure)
  state.challenge.goals.forEach(g => { g.progress = 0; g.done = false; });
  state.challenge.completed = false;
}
