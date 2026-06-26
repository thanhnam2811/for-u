// ── Lines 98 — Main Orchestrator ──
import { MAX_UNDO, LS_HIGH, LS_PALETTE, LS_SOUND, SPAWN_COUNT, PALETTES } from './constants.js';
import { state, cloneSnapshot, restoreSnapshot, resetState } from './state.js';
import { Sound } from './sound.js';
import { Haptics } from './haptics.js';
import { findBestHint, showHint, clearHint } from './hint.js';
import { PixiGame } from './pixi-game.js';
import { getEmptyCells, findPath, checkLines, checkAllNewBalls, spawnBalls, generateNextBalls, calculateScore } from './logic.js';
import {
  autoSave, loadSavedGame, clearSave, saveCheckpoint, loadCheckpoint, getCheckpointInfo,
  deleteCheckpoint, saveToLeaderboard, getLeaderboard, getGlobalLeaderboard, syncUserProgress
} from './save.js';
import { initSharedAuth } from '../../shared/auth.js';
import { auth } from '../../shared/firebase.js';

// DOM selector helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const delay = (ms) => new Promise(r => setTimeout(r, ms));

let pixiGame = null;

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  loadSettings();
  Sound.init();
  
  // Create and initialize PixiJS game board
  const boardContainerEl = $('#game-board');
  pixiGame = new PixiGame(boardContainerEl, onCellClick);
  
  // Expose pathfinder so PixiGame can draw real-time path overlays
  pixiGame.findPathFn = findPath;
  
  await pixiGame.init();
  
  buildPalettePanel();
  applyPalette(state.palette);
  setupEvents();
  
  // Try loading saved game
  if (!loadSavedGame()) {
    startNewGame();
  } else {
    // Resumed game successfully
    pixiGame.syncBoardWithState();
    renderPreview();
    renderScore();
    renderStats();
    renderUndoHintUI();
    renderCheckpointSlots();
    startTimer();
  }
  
  // Register Service Worker for offline play (production only)
  if ('serviceWorker' in navigator) {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then(() => console.log('Dev Service Worker unregistered from Lines98.'));
        }
      });
    } else {
      window.addEventListener('load', () => {
        const baseUrl = import.meta.env.BASE_URL || '/';
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
        
        navigator.serviceWorker.register(`${baseUrl}lines98/sw.js`, { scope: `${baseUrl}lines98/` })
          .then(reg => {
            console.log('Lines 98 Service Worker registered!', reg.scope);
            reg.update();
            setInterval(() => reg.update(), 15 * 60 * 1000);
          })
          .catch(err => console.error('Lines 98 Service Worker registration failed:', err));
      });
    }
  }
  
  // Connection states
  window.addEventListener('offline', () => {
    showToast('Đã ngắt kết nối. Bạn vẫn có thể chơi offline bình thường! 🎮');
  });
  window.addEventListener('online', () => {
    showToast('Đã khôi phục kết nối mạng! ⚡');
    if (auth.currentUser) {
      syncUserProgress(auth.currentUser);
    }
  });
  
  // Setup Google sign-in auth and sync via shared auth module
  initSharedAuth({
    onUserChanged: (user) => {
      updateGameUserUI(user);
    },
    syncProgress: async (user) => {
      showToast("🔄 Đang đồng bộ dữ liệu...");
      const needsReload = await syncUserProgress(user);
      if (needsReload) {
        showToast("✅ Đã đồng bộ tiến trình từ Cloud!");
        if (loadSavedGame()) {
          pixiGame.syncBoardWithState();
          renderPreview();
          renderScore();
          renderStats();
          renderUndoHintUI();
        }
        renderCheckpointSlots();
      } else {
        showToast("✅ Tiến trình đã được đồng bộ!");
      }
    },
    profileBtnSelector: '#google-login-btn'
  });
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
  
  // Render and sync
  pixiGame.syncBoardWithState();
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
    if (!document.hidden && !state.gameOver && !state.animating) {
      state.elapsedTime++;
      renderStats();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
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
  if (state.undoStack.length > MAX_UNDO) {
    state.undoStack.shift();
  }
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
  pixiGame.syncBoardWithState();
  renderPreview();
  renderScore();
  renderStats();
  renderUndoHintUI();
  autoSave();
}

// ── Movement & Game Step ──
async function executeMove(row, col) {
  const path = findPath(state.selected.row, state.selected.col, row, col);
  if (!path) return;

  // Save state for undo
  saveSnapshot();
  state.animating = true;
  
  // Clear hints
  clearHint(() => pixiGame.drawGrid());
  
  const fromR = state.selected.row, fromC = state.selected.col;
  const color = state.board[fromR][fromC];
  state.board[fromR][fromC] = 0;
  state.selected = null;
  state.moves++;
  
  // NOTE: Do NOT call syncBoardWithState() here! The board[from] is already 0,
  // so sync would destroy the sprite we need for the move animation.
  // Just redraw the grid to clear selection highlight.
  pixiGame.drawGrid();

  // Slide ball along path
  await new Promise(resolve => pixiGame.animateBallMove(path, resolve));
  
  // Land the ball
  state.board[row][col] = color;
  pixiGame.syncBoardWithState();
  Sound.land();
  Haptics.light();

  // Check lines
  const removed = checkLines(row, col);
  if (removed.length > 0) {
    Haptics.success();
    Sound.lineClear(removed.length);
    
    // Add floating score popup
    const earnedScore = calculateScore(removed.length);
    state.score += earnedScore;
    state.ballsCleared += removed.length;
    
    // Find center point for floating score popup
    const centerR = Math.round(removed.reduce((sum, p) => sum + p.row, 0) / removed.length);
    const centerC = Math.round(removed.reduce((sum, p) => sum + p.col, 0) / removed.length);
    pixiGame.showFloatingScore(earnedScore, centerR, centerC);
    
    // Clear particles animation
    await new Promise(resolve => pixiGame.animateClear(removed, resolve));
    
    // Set board spots to 0
    removed.forEach(p => { state.board[p.row][p.col] = 0; });
    pixiGame.syncBoardWithState();
    
    state.animating = false;
  } else {
    // Spawn new balls
    const ballsToAnimate = [];
    state.nextBalls.forEach(nb => {
      if (state.board[nb.row][nb.col] === 0) {
        ballsToAnimate.push(nb);
      }
    });
    
    spawnBalls(SPAWN_COUNT);
    Sound.spawn();
    
    // Animate spawns expanding
    await new Promise(resolve => pixiGame.animateSpawn(ballsToAnimate, resolve));
    
    // Check if new spawns formed lines
    const spawnRemoved = checkAllNewBalls(
      state.nextBalls.filter(b => state.board[b.row]?.[b.col] > 0)
    );
    
    if (spawnRemoved.length > 0) {
      Haptics.success();
      Sound.lineClear(spawnRemoved.length);
      
      const earnedScore = calculateScore(spawnRemoved.length);
      state.score += earnedScore;
      state.ballsCleared += spawnRemoved.length;
      
      const centerR = Math.round(spawnRemoved.reduce((sum, p) => sum + p.row, 0) / spawnRemoved.length);
      const centerC = Math.round(spawnRemoved.reduce((sum, p) => sum + p.col, 0) / spawnRemoved.length);
      pixiGame.showFloatingScore(earnedScore, centerR, centerC);
      
      await new Promise(resolve => pixiGame.animateClear(spawnRemoved, resolve));
      
      spawnRemoved.forEach(p => { state.board[p.row][p.col] = 0; });
      pixiGame.syncBoardWithState();
    }
    
    generateNextBalls();
    renderPreview();
    
    // Check game over
    if (getEmptyCells().length === 0) {
      state.gameOver = true;
      state.animating = false;
      stopTimer();
      Sound.gameOver();
      Haptics.gameOver();
      
      // Update high scores
      if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem(LS_HIGH, state.highScore);
        showToast('🏆 Kỷ lục mới xuất sắc! ' + state.score + 'đ');
      }
      
      saveToLeaderboard();
      clearSave();
      showGameOver();
      return;
    }
    state.animating = false;
  }
  
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(LS_HIGH, state.highScore);
  }
  
  renderScore();
  renderStats();
  renderUndoHintUI();
  autoSave();
}

// ── Cell Click Handler ──
async function onCellClick(row, col) {
  if (state.animating || state.gameOver) return;
  Sound.resume();
  const value = state.board[row][col];

  // Click ball
  if (value !== 0) {
    if (state.selected && state.selected.row === row && state.selected.col === col) {
      state.selected = null;
      Sound.deselect();
      Haptics.light();
    } else {
      state.selected = { row, col };
      Sound.select();
      Haptics.light();
      clearHint(() => pixiGame.drawGrid());
    }
    pixiGame.syncBoardWithState();
    return;
  }

  // Click empty cell
  if (!state.selected) return;
  const path = findPath(state.selected.row, state.selected.col, row, col);
  if (!path) {
    Sound.noPath();
    Haptics.error();
    // Buzz effect handled by sound/haptics, we can also flash selected cell outline briefly
    return;
  }

  await executeMove(row, col);
}

// ── Hint ──
function useHint() {
  if (state.hintLeft <= 0 || state.animating || state.gameOver) return;
  Sound.resume();
  const hint = findBestHint();
  if (!hint) {
    showToast('Không tìm thấy gợi ý nước đi nào 🤷');
    return;
  }
  state.hintLeft--;
  Sound.hint();
  
  // Trigger hint overlay on PixiJS
  showHint(hint, () => {
    pixiGame.drawGrid();
  });
  
  renderUndoHintUI();
  autoSave();
}

// ── Palette modal setup ──
function buildPalettePanel() {
  const container = $('#palette-options-container');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(PALETTES).forEach(([key, value]) => {
    const btn = document.createElement('button');
    btn.className = 'palette-option w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer';
    btn.dataset.palette = key;
    btn.innerHTML = `
      <span class="font-display font-bold text-sm text-slate-800 dark:text-slate-200">${value.name}</span>
      <div class="flex gap-1">
        ${value.colors.slice(0, 5).map(c => `<span class="w-4 h-4 rounded-full" style="background: ${c.main}"></span>`).join('')}
      </div>
    `;
    btn.addEventListener('click', () => selectPaletteHandler(key));
    container.appendChild(btn);
  });
}

function selectPaletteHandler(key) {
  state.palette = key;
  localStorage.setItem(LS_PALETTE, key);
  applyPalette(key);
  
  // Highlight active palette option
  $$('.palette-option').forEach(o => o.classList.toggle('active', o.dataset.palette === key));
  
  // Regenerate PixiJS ball textures and redraw
  if (pixiGame) {
    pixiGame.updateTextures();
    // Update all ball textures in sprites
    pixiGame.ballSprites.forEach((sprite, key) => {
      const [r, c] = key.split(',').map(Number);
      const color = state.board[r][c];
      sprite.texture = pixiGame.textures[color];
    });
    pixiGame.drawGrid();
    pixiGame.drawPathOverlay();
  }
  
  renderPreview();
  autoSave();
}

function applyPalette(key) {
  const pal = PALETTES[key];
  if (!pal) return;
  const root = document.documentElement;
  pal.colors.forEach((c, i) => {
    const n = i + 1;
    root.style.setProperty(`--ball-${n}`, c.main);
    root.style.setProperty(`--ball-${n}-light`, c.light);
    root.style.setProperty(`--ball-${n}-dark`, c.dark);
    root.style.setProperty(`--ball-${n}-glow`, c.glow);
  });
}

// ── Sound Controls ──
function updateSoundUI() {
  const icon = $('#sound-icon'), label = $('#sound-label'), btn = $('#sound-toggle');
  if (!icon) return;
  if (Sound.enabled) {
    icon.textContent = 'volume_up';
    label.textContent = 'Âm';
    btn.classList.remove('muted');
  } else {
    icon.textContent = 'volume_off';
    label.textContent = 'Tắt';
    btn.classList.add('muted');
  }
}

// ── Sync UI updates ──
function renderPreview() {
  const c = $('#next-preview');
  if (!c) return;
  c.innerHTML = '';
  for (const nb of state.nextBalls) {
    if (!nb) continue;
    const color = (typeof nb === 'object' && nb !== null) ? nb.color : nb;
    if (color === undefined || isNaN(color)) continue;
    const d = document.createElement('div');
    d.className = `preview-ball ball-${color}`;
    c.appendChild(d);
  }
}

function renderScore() {
  $('#score').textContent = state.score;
  $('#high-score').textContent = state.highScore;
  
  const finalScore = $('#final-score');
  const finalHigh = $('#final-high');
  if (finalScore) finalScore.textContent = state.score;
  if (finalHigh) finalHigh.textContent = state.highScore;
}

function renderStats() {
  const m = Math.floor(state.elapsedTime / 60);
  const s = state.elapsedTime % 60;
  const t = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  
  const te = $('#stat-time'), me = $('#stat-moves'), ce = $('#stat-cleared');
  if (te) te.textContent = `⏱ ${t}`;
  if (me) me.textContent = `🎯 ${state.moves}`;
  if (ce) ce.textContent = `💥 ${state.ballsCleared}`;
}

function renderUndoHintUI() {
  const ub = $('#undo-btn');
  const hb = $('#hint-btn'), hc = $('#hint-count');
  
  if (ub) {
    ub.disabled = state.undoStack.length === 0 || state.animating || state.gameOver;
  }
  if (hc) {
    hc.textContent = state.hintLeft;
  }
  if (hb) {
    hb.disabled = state.hintLeft <= 0 || state.animating || state.gameOver;
    hb.style.opacity = state.hintLeft <= 0 ? '0.4' : '1';
  }
}

function showToast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2500);
}

function showGameOver() {
  const ov = $('#game-over-overlay');
  if (!ov) return;
  
  const old = ov.querySelector('.new-record-label');
  if (old) old.remove();
  
  if (state.score >= state.highScore && state.score > 0) {
    const l = document.createElement('div');
    l.className = 'new-record-label text-brand-pink font-display font-bold text-sm mt-2 animate-bounce';
    l.textContent = '🎉 Kỷ lục mới!';
    ov.querySelector('.font-sans.font-semibold.text-slate-400').after(l);
  }
  
  const cpBtn = $('#load-checkpoint-btn');
  if (cpBtn) {
    const hasAny = [0, 1, 2].some(i => localStorage.getItem('lines98_checkpoint_' + i));
    cpBtn.style.display = hasAny ? '' : 'none';
  }
  ov.classList.add('visible');
}

function hideGameOver() {
  $('#game-over-overlay').classList.remove('visible');
}

// ── Checkpoint UI ──
function renderCheckpointSlots() {
  for (let i = 0; i < 3; i++) {
    const raw = localStorage.getItem('lines98_checkpoint_' + i);
    const info = $(`.cp-info[data-slot="${i}"]`);
    const loadBtn = $(`.cp-load[data-slot="${i}"]`);
    if (!info) continue;
    if (raw) {
      const cp = JSON.parse(raw);
      const d = new Date(cp.timestamp);
      const m = Math.floor(cp.elapsedTime / 60), s = cp.elapsedTime % 60;
      info.textContent = `${cp.score}đ • ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} • ${d.toLocaleDateString('vi')}`;
      info.classList.remove('empty');
      if (loadBtn) loadBtn.disabled = false;
    } else {
      info.textContent = 'Trống';
      info.classList.add('empty');
      if (loadBtn) loadBtn.disabled = true;
    }
  }
}

// ── Leaderboard UI ──
async function showLeaderboardUI() {
  const ov = $('#leaderboard-overlay');
  const list = $('#leaderboard-list');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-8 text-sm text-slate-400 dark:text-slate-550 font-semibold select-none">Đang tải bảng xếp hạng... 🔄</div>';
  ov.classList.add('visible');
  
  const data = await getGlobalLeaderboard();
  list.innerHTML = '';
  
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="text-center py-8 text-sm text-slate-400 dark:text-slate-550 font-semibold select-none">Chưa có dữ liệu</div>';
  } else {
    data.forEach((e, i) => {
      const item = document.createElement('div');
      item.className = 'lb-item flex items-center justify-between p-3 rounded-2xl bg-white/30 dark:bg-slate-900/35 border border-white/40 dark:border-slate-800/40 shadow-sm transition-all duration-300 select-none';
      if (e.score === state.score && e.displayName === (auth.currentUser?.displayName || 'Bạn')) {
        item.classList.add('highlight-item');
      }
      
      const rank = i + 1;
      let rankBadge = '';
      if (rank === 1) {
        rankBadge = '<span class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-white font-display font-bold text-sm shadow-[0_2px_8px_rgba(245,158,11,0.25)]">🥇</span>';
      } else if (rank === 2) {
        rankBadge = '<span class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 text-white font-display font-bold text-sm shadow-[0_2px_8px_rgba(148,163,184,0.25)]">🥈</span>';
      } else if (rank === 3) {
        rankBadge = '<span class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-display font-bold text-sm shadow-[0_2px_8px_rgba(180,83,9,0.25)]">🥉</span>';
      } else {
        rankBadge = `<span class="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100/60 dark:bg-slate-800/45 text-slate-500 dark:text-slate-400 font-display font-bold text-xs">#${rank}</span>`;
      }
      
      const d = new Date(e.date);
      const dateStr = d.toLocaleDateString('vi') + ' • ' + d.toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' });
      
      const name = e.displayName || "Bạn";
      const photo = e.photoURL 
        ? `<img class="lb-avatar w-9 h-9 rounded-full object-cover border border-white/60 dark:border-slate-700/60 shadow-sm" src="${e.photoURL}" alt="" />` 
        : `<span class="material-icons-round text-slate-400 dark:text-slate-550 text-3xl">account_circle</span>`;
      
      item.innerHTML = `
        <div class="flex items-center gap-3">
          ${rankBadge}
          <div class="flex items-center gap-2">
            ${photo}
            <div class="flex flex-col text-left">
              <span class="font-sans font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">${name}</span>
              <span class="font-sans text-[10px] text-slate-400 dark:text-slate-550 font-semibold mt-0.5">${dateStr}</span>
            </div>
          </div>
        </div>
        <div class="font-display font-bold text-base bg-gradient-to-r from-brand-pink to-brand-purple bg-clip-text text-transparent drop-shadow-sm pr-1">
          ${e.score} <span class="text-[10px] font-sans font-semibold text-slate-400 dark:text-slate-500">đ</span>
        </div>
      `;
      list.appendChild(item);
    });
  }
}

// ── UI Events Setup ──
function setupEvents() {
  // New game
  $('#new-game-btn').addEventListener('click', () => {
    if (confirm('Bắt đầu ván chơi mới?')) {
      startNewGame();
    }
  });
  
  $('#restart-btn').addEventListener('click', () => {
    startNewGame();
  });
  
  // Undo
  $('#undo-btn').addEventListener('click', () => {
    undo();
  });
  
  // Hint
  $('#hint-btn').addEventListener('click', () => {
    useHint();
  });
  
  // Sound toggle
  $('#sound-toggle').addEventListener('click', () => {
    Sound.enabled = !Sound.enabled;
    localStorage.setItem(LS_SOUND, Sound.enabled);
    updateSoundUI();
    Sound.resume();
    Sound.select();
  });
  
  // Palette modal toggle
  $('#palette-toggle').addEventListener('click', () => {
    Sound.resume();
    $('#palette-modal').classList.add('visible');
  });
  $('#close-palette-btn').addEventListener('click', () => {
    $('#palette-modal').classList.remove('visible');
  });
  
  // Checkpoint modal toggle
  $('#checkpoint-toggle').addEventListener('click', () => {
    Sound.resume();
    renderCheckpointSlots();
    $('#checkpoint-modal').classList.add('visible');
  });
  $('#close-checkpoint-btn').addEventListener('click', () => {
    $('#checkpoint-modal').classList.remove('visible');
  });
  
  // Leaderboard modal toggle
  $('#leaderboard-btn').addEventListener('click', () => {
    Sound.resume();
    showLeaderboardUI();
  });
  $('#close-leaderboard-btn').addEventListener('click', () => {
    $('#leaderboard-overlay').classList.remove('visible');
  });
  
  // Checkpoint actions (save / load)
  $$('.cp-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = parseInt(btn.dataset.slot);
      saveCheckpoint(slot);
      Sound.checkpoint();
      showToast(`💾 Đã lưu Checkpoint Slot ${slot + 1}!`);
      renderCheckpointSlots();
    });
  });
  
  $$('.cp-load').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = parseInt(btn.dataset.slot);
      if (loadCheckpoint(slot)) {
        Sound.checkpoint();
        showToast(`📌 Đã tải Checkpoint Slot ${slot + 1}!`);
        
        pixiGame.syncBoardWithState();
        renderPreview();
        renderScore();
        renderStats();
        renderUndoHintUI();
        $('#checkpoint-modal').classList.remove('visible');
        hideGameOver();
        startTimer();
      }
    });
  });
  
  $('#load-checkpoint-btn').addEventListener('click', () => {
    // Load most recent active checkpoint
    let latestSlot = -1;
    let latestTime = 0;
    for (let i = 0; i < 3; i++) {
      const info = getCheckpointInfo(i);
      if (info && info.timestamp > latestTime) {
        latestTime = info.timestamp;
        latestSlot = i;
      }
    }
    
    if (latestSlot !== -1 && loadCheckpoint(latestSlot)) {
      Sound.checkpoint();
      showToast(`📌 Đã tải Checkpoint Slot ${latestSlot + 1}!`);
      pixiGame.syncBoardWithState();
      renderPreview();
      renderScore();
      renderStats();
      renderUndoHintUI();
      hideGameOver();
      startTimer();
    }
  });
  
  // Sync Conflict triggers
  $('#keep-local-btn').addEventListener('click', () => {
    // Handled inside promise inside syncUserProgress
  });
  $('#restore-cloud-btn').addEventListener('click', () => {
    // Handled inside promise inside syncUserProgress
  });
}

function updateGameUserUI(user) {
  const avatarIcon = $('#user-avatar-icon');
  const avatarImg = $('#user-avatar-img');
  if (!avatarIcon) return;
  
  if (user) {
    if (user.photoURL) {
      avatarImg.src = user.photoURL;
      avatarImg.style.display = 'block';
      avatarIcon.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarIcon.style.display = 'block';
      avatarIcon.textContent = 'account_circle';
    }
  } else {
    avatarImg.style.display = 'none';
    avatarIcon.style.display = 'block';
    avatarIcon.textContent = 'account_circle';
  }
}
