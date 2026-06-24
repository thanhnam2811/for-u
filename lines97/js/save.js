// ── Lines 97 — Save / Checkpoint / Leaderboard ──
import { LS_SAVE, LS_LEADERBOARD, LS_CHECKPOINT } from './constants.js';
import { state, cloneSnapshot, restoreSnapshot } from './state.js';

// ── Auto-save (current game) ──
export function autoSave() {
  const data = {
    ...cloneSnapshot(),
    highScore: state.highScore,
    palette: state.palette,
    undoStack: state.undoStack.map(s => ({
      board: s.board.map(r => [...r]),
      score: s.score,
      nextBalls: s.nextBalls.map(b => ({ ...b })),
      moves: s.moves,
      ballsCleared: s.ballsCleared,
      longestLine: s.longestLine,
      elapsedTime: s.elapsedTime,
    })),
  };
  try { localStorage.setItem(LS_SAVE, JSON.stringify(data)); } catch (_) {}
}

export function loadSavedGame() {
  const raw = localStorage.getItem(LS_SAVE);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data.board || data.board.length === 0) return false;
    restoreSnapshot(data);
    if (data.highScore !== undefined) state.highScore = data.highScore;
    if (data.palette) state.palette = data.palette;
    if (data.undoStack) {
      state.undoStack = data.undoStack.map(s => ({
        board: s.board.map(r => [...r]),
        score: s.score,
        nextBalls: s.nextBalls.map(b => ({ ...b })),
        moves: s.moves,
        ballsCleared: s.ballsCleared,
        longestLine: s.longestLine,
        elapsedTime: s.elapsedTime,
      }));
    }
    return true;
  } catch (_) { return false; }
}

export function clearSave() {
  localStorage.removeItem(LS_SAVE);
}

// ── Checkpoints (3 slots) ──
export function saveCheckpoint(slot) {
  const data = {
    ...cloneSnapshot(),
    timestamp: Date.now(),
  };
  try { localStorage.setItem(LS_CHECKPOINT + slot, JSON.stringify(data)); } catch (_) {}
}

export function loadCheckpoint(slot) {
  const raw = localStorage.getItem(LS_CHECKPOINT + slot);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    restoreSnapshot(data);
    state.undoStack = [];
    return true;
  } catch (_) { return false; }
}

export function getCheckpointInfo(slot) {
  const raw = localStorage.getItem(LS_CHECKPOINT + slot);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

export function deleteCheckpoint(slot) {
  localStorage.removeItem(LS_CHECKPOINT + slot);
}

// ── Leaderboard ──
export function saveToLeaderboard() {
  if (state.score <= 0) return;
  const board = getLeaderboard();
  board.push({ score: state.score, date: Date.now(), moves: state.moves });
  board.sort((a, b) => b.score - a.score);
  if (board.length > 10) board.length = 10;
  try { localStorage.setItem(LS_LEADERBOARD, JSON.stringify(board)); } catch (_) {}
}

export function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_LEADERBOARD)) || []; }
  catch (_) { return []; }
}
