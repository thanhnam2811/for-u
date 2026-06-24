// ── Lines 97 — Main Entry Point ──
import { MAX_UNDO, MAX_HINT, LS_HIGH, LS_PALETTE, LS_SOUND, SPAWN_COUNT } from './constants.js';
import { state, cloneSnapshot, resetState } from './state.js';
import { Sound } from './sound.js';
import { getEmptyCells, findPath, checkLines, checkAllNewBalls, spawnBalls, generateNextBalls } from './logic.js';
import {
  $, $$, buildBoard, renderBoard, renderPreview, renderScore, renderStats, renderUndoHintUI,
  animateMove, animateSpawn, removeWithEffect, showGameOver, hideGameOver, showToast,
  delay, buildPalettePanel, applyPalette, getCell, showLeaderboard, hideLeaderboard,
  renderCheckpointSlots,
} from './render.js';
import { autoSave, loadSavedGame, clearSave, saveCheckpoint, loadCheckpoint, saveToLeaderboard, getLeaderboard } from './save.js';
import { findBestHint, showHint, clearHint } from './hint.js';

// ── Init ──
function init() {
  loadSettings();
  Sound.init();
  buildBoard();
  buildPalettePanel();
  applyPalette(state.palette);
  setupEvents();

  if (!loadSavedGame()) {
    startNewGame();
  } else {
    // Resumed saved game
    renderBoard();
    renderPreview();
    renderScore();
    renderStats();
    renderUndoHintUI();
    renderCheckpointSlots();
    startTimer();
  }
}

function loadSettings() {
  state.highScore = parseInt(localStorage.getItem(LS_HIGH)) || 0;
  state.palette = localStorage.getItem(LS_PALETTE) || 'pastel';
  const sp = localStorage.getItem(LS_SOUND);
  Sound.enabled = sp === null ? true : sp === 'true';
  updateSoundUI();
}

// ── New Game ──
function startNewGame() {
  stopTimer();
  resetState();
  generateNextBalls();
  spawnBalls(5); // INITIAL_SPAWN
  generateNextBalls();
  clearSave();
  renderBoard();
  renderPreview();
  renderScore();
  renderStats();
  renderUndoHintUI();
  renderCheckpointSlots();
  hideGameOver();
  startTimer();
}

// ── Timer ──
function startTimer() {
  stopTimer();
  state.timerInterval = setInterval(() => {
    if (!document.hidden && !state.gameOver) {
      state.elapsedTime++;
      renderStats();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

// ── Undo ──
function saveSnapshot() {
  state.undoStack.push({
    board: state.board.map(r => [...r]),
    score: state.score,
    nextBalls: state.nextBalls.map(b => ({ ...b })),
    moves: state.moves,
    ballsCleared: state.ballsCleared,
    longestLine: state.longestLine,
    elapsedTime: state.elapsedTime,
  });
}

function undo() {
  if (!state.undoStack.length || state.animating || state.gameOver) return;
  const snap = state.undoStack.pop();
  state.board = snap.board.map(r => [...r]);
  state.score = snap.score;
  state.nextBalls = snap.nextBalls.map(b => ({ ...b }));
  
  // Randomize only next spawn positions to let player reroll positions upon undo
  const empties = getEmptyCells();
  for (const ball of state.nextBalls) {
    if (empties.length === 0) break;
    const idx = Math.floor(Math.random() * empties.length);
    const pos = empties.splice(idx, 1)[0];
    ball.row = pos.row;
    ball.col = pos.col;
  }

  state.moves = snap.moves;
  state.ballsCleared = snap.ballsCleared;
  state.longestLine = snap.longestLine;
  state.elapsedTime = snap.elapsedTime;
  state.selected = null;
  Sound.undo();
  renderBoard(); renderPreview(); renderScore(); renderStats(); renderUndoHintUI();
  autoSave();
}

// ── Cell Click ──
async function onCellClick(row, col) {
  if (state.animating || state.gameOver) return;
  Sound.resume();
  const value = state.board[row][col];

  // Click ball
  if (value !== 0) {
    if (state.selected && state.selected.row === row && state.selected.col === col) {
      state.selected = null; Sound.deselect();
    } else {
      state.selected = { row, col }; Sound.select();
    }
    clearHint(); renderBoard(); return;
  }

  // Click empty — need selected
  if (!state.selected) return;
  const path = findPath(state.selected.row, state.selected.col, row, col);
  if (!path) {
    Sound.noPath();
    const c = getCell(row, col);
    c.classList.add('no-path');
    setTimeout(() => c.classList.remove('no-path'), 400);
    return;
  }

  // Save for undo
  saveSnapshot();
  state.animating = true;
  clearHint();
  const fromR = state.selected.row, fromC = state.selected.col;
  const color = state.board[fromR][fromC];
  state.board[fromR][fromC] = 0;
  state.selected = null;
  state.moves++;
  renderBoard();

  await animateMove(path, color);
  state.board[row][col] = color;
  renderBoard();
  Sound.land();

  // Check lines
  const removed = checkLines(row, col);
  if (removed.length > 0) {
    await removeWithEffect(removed);
    state.animating = false;
  } else {
    // Spawn
    spawnBalls(SPAWN_COUNT);
    renderBoard(); Sound.spawn();
    await animateSpawn();
    const spawnRemoved = checkAllNewBalls(
      state.nextBalls.filter(b => state.board[b.row]?.[b.col])
    );
    if (spawnRemoved.length > 0) await removeWithEffect(spawnRemoved);
    generateNextBalls();
    renderPreview();
    if (getEmptyCells().length === 0) {
      state.gameOver = true;
      state.animating = false;
      stopTimer();
      Sound.gameOver();
      saveToLeaderboard();
      clearSave();
      showGameOver();
      return;
    }
    state.animating = false;
  }
  renderStats(); renderUndoHintUI(); autoSave();
}

// ── Hint ──
function useHint() {
  if (state.hintLeft <= 0 || state.animating || state.gameOver) return;
  Sound.resume();
  const hint = findBestHint();
  if (!hint) { showToast('Không tìm thấy gợi ý 🤷'); return; }
  state.hintLeft--;
  Sound.hint();
  showHint(hint);
  renderUndoHintUI();
  autoSave();
}

// ── Palette select ──
function selectPaletteHandler(key) {
  state.palette = key;
  localStorage.setItem(LS_PALETTE, key);
  applyPalette(key);
  $$('.palette-option').forEach(o => o.classList.toggle('active', o.dataset.palette === key));
  renderBoard(); renderPreview();
  autoSave();
}

// ── Sound UI ──
function updateSoundUI() {
  const icon = $('#sound-icon'), label = $('#sound-label'), btn = $('#sound-toggle');
  if (!icon) return;
  if (Sound.enabled) {
    icon.textContent = 'volume_up'; label.textContent = 'Âm thanh'; btn.classList.remove('muted');
  } else {
    icon.textContent = 'volume_off'; label.textContent = 'Tắt tiếng'; btn.classList.add('muted');
  }
}

// ── Events ──
function setupEvents() {
  // Board — use pointerdown for faster mobile response
  $('#game-board').addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    e.preventDefault();
    onCellClick(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
  });

  // Buttons
  $('#new-game-btn').addEventListener('click', () => {
    Sound.resume();
    if (state.moves > 0 && !state.gameOver && !confirm('Bắt đầu ván mới?')) return;
    startNewGame();
  });
  $('#restart-btn').addEventListener('click', () => { Sound.resume(); startNewGame(); });
  $('#undo-btn').addEventListener('click', () => undo());
  $('#hint-btn').addEventListener('click', () => useHint());

  // Sound
  $('#sound-toggle').addEventListener('click', () => {
    Sound.enabled = !Sound.enabled;
    localStorage.setItem(LS_SOUND, Sound.enabled);
    updateSoundUI();
    if (Sound.enabled) { Sound.resume(); Sound.select(); }
  });

  // Palette panel
  $('#palette-toggle').addEventListener('click', () => {
    $('#palette-panel').classList.toggle('open');
    $('#palette-toggle').classList.toggle('active');
  });
  $('#palette-panel').addEventListener('click', (e) => {
    const opt = e.target.closest('.palette-option');
    if (opt) selectPaletteHandler(opt.dataset.palette);
  });

  // Checkpoint panel
  $('#checkpoint-toggle').addEventListener('click', () => {
    $('#checkpoint-panel').classList.toggle('open');
    $('#checkpoint-toggle').classList.toggle('active');
    renderCheckpointSlots();
  });

  // Checkpoint save/load
  document.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('.cp-save');
    const loadBtn = e.target.closest('.cp-load');
    if (saveBtn) {
      const slot = saveBtn.dataset.slot;
      saveCheckpoint(slot);
      Sound.checkpoint();
      showToast(`💾 Đã lưu checkpoint ${+slot + 1}`);
      renderCheckpointSlots();
    }
    if (loadBtn) {
      const slot = loadBtn.dataset.slot;
      if (loadCheckpoint(slot)) {
        Sound.checkpoint();
        hideGameOver();
        renderBoard(); renderPreview(); renderScore(); renderStats(); renderUndoHintUI();
        startTimer();
        autoSave();
        showToast(`▶ Đã tải checkpoint ${+slot + 1}`);
      }
    }
  });

  // Load checkpoint from game-over
  const lcBtn = $('#load-checkpoint-btn');
  if (lcBtn) lcBtn.addEventListener('click', () => {
    hideGameOver();
    $('#checkpoint-panel').classList.add('open');
    $('#checkpoint-toggle').classList.add('active');
    renderCheckpointSlots();
  });

  // Leaderboard
  $('#leaderboard-btn').addEventListener('click', () => {
    showLeaderboard(getLeaderboard(), null);
  });
  $('#close-leaderboard-btn').addEventListener('click', hideLeaderboard);
  // Close overlay on backdrop click
  $('#leaderboard-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideLeaderboard();
  });
  $('#game-over-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget && state.gameOver) { /* don't close on backdrop */ }
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return; }
    switch (e.key.toLowerCase()) {
      case 'h': if (!e.ctrlKey) useHint(); break;
      case 'n': if (!e.ctrlKey && !e.altKey) {
        if (state.moves > 0 && !state.gameOver && !confirm('Bắt đầu ván mới?')) return;
        startNewGame();
        break;
      }
      case 'm': if (!e.ctrlKey) {
        Sound.enabled = !Sound.enabled;
        localStorage.setItem(LS_SOUND, Sound.enabled);
        updateSoundUI();
        break;
      }
      case 'escape':
        if ($('#leaderboard-overlay').classList.contains('visible')) { hideLeaderboard(); break; }
        if (state.selected) { state.selected = null; clearHint(); renderBoard(); break; }
        break;
    }
  });

  // Pause timer when tab hidden
  document.addEventListener('visibilitychange', () => {
    // Timer auto-pauses via document.hidden check in interval
  });
}

// ── Boot ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
