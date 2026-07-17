// ── Lines 97 — Rendering & Animations ──
import { SIZE, PALETTES, MOVE_STEP_MS } from './constants.js';
import { state } from './state.js';
import { Sound } from './sound.js';
import { calculateScore } from './logic.js';
import { syncHighScoreToCloud } from './save.js';

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => document.querySelectorAll(s);
export const delay = (ms) => new Promise(r => setTimeout(r, ms));

export function getCell(r, c) {
  return $(`.cell[data-row="${r}"][data-col="${c}"]`);
}

// ── Board ──
export function buildBoard() {
  const board = $('#game-board');
  board.innerHTML = '';
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      board.appendChild(cell);
    }
}

export function renderBoard() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const cell = getCell(r, c);
      const old = cell.querySelector('.ball');
      if (old) old.remove();
      // Clear hint and selection classes
      cell.classList.remove('hint-src', 'hint-dst', 'selected-cell');
      const val = state.board[r][c];
      if (val) {
        const ball = document.createElement('div');
        ball.className = `ball ball-${val}`;
        if (state.selected && state.selected.row === r && state.selected.col === c) {
          ball.classList.add('selected');
          cell.classList.add('selected-cell');
        }
        cell.appendChild(ball);
      }
    }
}

export function renderPreview() {
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

let currentScore = 0;
let currentHighScore = 0;
let scoreAnimId = null;
let highScoreAnimId = null;

function animateScore(target, isHigh = false) {
  const el = isHigh ? $('#high-score') : $('#score');
  if (!el) return;

  const current = isHigh ? currentHighScore : currentScore;
  if (current === target) {
    el.textContent = target;
    return;
  }

  if (isHigh && highScoreAnimId) {
    cancelAnimationFrame(highScoreAnimId);
    highScoreAnimId = null;
  } else if (!isHigh && scoreAnimId) {
    cancelAnimationFrame(scoreAnimId);
    scoreAnimId = null;
  }

  const startTime = performance.now();
  const startVal = current;

  function update(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / 300, 1);
    
    // Ease out quad
    const easeProgress = progress * (2 - progress);
    const val = Math.round(startVal + (target - startVal) * easeProgress);
    
    el.textContent = val;
    
    if (isHigh) {
      currentHighScore = val;
    } else {
      currentScore = val;
    }

    if (progress < 1) {
      if (isHigh) {
        highScoreAnimId = requestAnimationFrame(update);
      } else {
        scoreAnimId = requestAnimationFrame(update);
      }
    } else {
      el.textContent = target;
      if (isHigh) {
        currentHighScore = target;
        highScoreAnimId = null;
      } else {
        currentScore = target;
        scoreAnimId = null;
      }
    }
  }

  if (isHigh) {
    highScoreAnimId = requestAnimationFrame(update);
  } else {
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 300);
    scoreAnimId = requestAnimationFrame(update);
  }
}

export function renderScore() {
  animateScore(state.score, false);
  animateScore(state.highScore, true);
}

export function renderStats() {
  const m = Math.floor(state.elapsedTime / 60);
  const s = state.elapsedTime % 60;
  const t = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const te = $('#stat-time'), me = $('#stat-moves'), ce = $('#stat-cleared');
  if (te) te.textContent = `⏱ ${t}`;
  if (me) me.textContent = `🎯 ${state.moves}`;
  if (ce) ce.textContent = `💥 ${state.ballsCleared}`;
}

export function renderUndoHintUI() {
  const ub = $('#undo-btn'), uc = $('#undo-count');
  const hb = $('#hint-btn'), hc = $('#hint-count');
  if (ub) ub.disabled = state.undoStack.length === 0;
  if (uc) uc.textContent = '';
  if (hb) hb.disabled = state.hintLeft <= 0;
  if (hc) hc.textContent = state.hintLeft;
}

// ── Palette ──
export function buildPalettePanel() {
  const container = $('#palette-options-container');
  if (!container) return;
  container.innerHTML = '';
  for (const [key, pal] of Object.entries(PALETTES)) {
    const opt = document.createElement('div');
    opt.className = 'palette-option' + (key === state.palette ? ' active' : '');
    opt.dataset.palette = key;
    const name = document.createElement('span');
    name.className = 'palette-name';
    name.textContent = pal.name;
    const preview = document.createElement('div');
    preview.className = 'palette-preview';
    pal.colors.forEach(c => {
      const dot = document.createElement('div');
      dot.className = 'palette-dot';
      dot.style.background = `radial-gradient(circle at 35% 30%, ${c.light}, ${c.main} 55%, ${c.dark})`;
      dot.style.boxShadow = `0 1.5px 4px ${c.glow}, inset 0 -1.5px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.3)`;
      preview.appendChild(dot);
    });
    opt.appendChild(name);
    opt.appendChild(preview);
    container.appendChild(opt);
  }
}

export function applyPalette(key) {
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

// ── Animations ──
export async function animateMove(path, color) {
  const board = $('#game-board');
  const bRect = board.getBoundingClientRect();
  const pad = parseFloat(getComputedStyle(board).paddingLeft) || 6;
  const gap = 2;
  const eCell = (bRect.width - pad * 2 - gap * 8) / 9;
  const ballPx = eCell * 0.72;
  const ghost = document.createElement('div');
  ghost.className = `ghost-ball ball-${color}`;
  ghost.style.width = `${ballPx}px`;
  ghost.style.height = `${ballPx}px`;
  board.appendChild(ghost);
  const pos = (r, c) => {
    ghost.style.left = `${pad + c * (eCell + gap) + (eCell - ballPx) / 2}px`;
    ghost.style.top = `${pad + r * (eCell + gap) + (eCell - ballPx) / 2}px`;
  };
  pos(path[0].row, path[0].col);
  ghost.offsetHeight; // reflow
  for (let i = 1; i < path.length; i++) {
    pos(path[i].row, path[i].col);
    Sound.moveStep();
    await delay(MOVE_STEP_MS);
  }
  ghost.remove();
}

export async function animateSpawn() {
  if ($$('.ball.spawning').length) await delay(350);
}

export async function removeWithEffect(positions) {
  const points = calculateScore(positions.length);
  state.score += points;
  const isNew = state.score > state.highScore;
  if (isNew) {
    state.highScore = state.score;
    localStorage.setItem('lines97_highScore', state.highScore);
    syncHighScoreToCloud();
  }

  for (const { row, col } of positions) {
    const cell = getCell(row, col);
    const ball = cell.querySelector('.ball');
    if (ball) { ball.classList.add('exploding'); createParticles(cell, state.board[row][col]); }
  }
  if (positions.length) {
    const mid = positions[Math.floor(positions.length / 2)];
    showScoreFloat(mid.row, mid.col, `+${points}`);
  }
  Sound.lineClear(positions.length);
  await delay(450);
  for (const { row, col } of positions) state.board[row][col] = 0;
  // Update stats
  state.ballsCleared += positions.length;
  if (positions.length > state.longestLine) state.longestLine = positions.length;
  renderBoard();
  renderScore();
  renderStats();
  if (isNew) Sound.newRecord();
}

function createParticles(cell, color) {
  const board = $('#game-board');
  const cr = cell.getBoundingClientRect(), br = board.getBoundingClientRect();
  const cx = cr.left - br.left + cr.width / 2, cy = cr.top - br.top + cr.height / 2;
  const pal = PALETTES[state.palette].colors[color - 1];
  
  // Premium particle count
  const count = window.innerWidth <= 480 ? 10 : 20;
  
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = `radial-gradient(circle, ${pal.light} 0%, ${pal.main} 60%, ${pal.dark} 100%)`;
    p.style.setProperty('--glow-color', pal.glow || pal.main);
    
    const a = Math.random() * Math.PI * 2;
    const d = 25 + Math.random() * 45;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d;
    
    const size = 4 + Math.random() * 6;
    const gravity = 25 + Math.random() * 35;
    const duration = 0.6 + Math.random() * 0.3;
    
    p.style.setProperty('--px', `${px}px`);
    p.style.setProperty('--py', `${py}px`);
    p.style.setProperty('--size', `${size}px`);
    p.style.setProperty('--gravity', `${gravity}px`);
    p.style.setProperty('--duration', `${duration}s`);
    
    board.appendChild(p);
    setTimeout(() => p.remove(), duration * 1000 + 100);
  }
}

function showScoreFloat(row, col, text) {
  const board = $('#game-board');
  const pad = parseFloat(getComputedStyle(board).paddingLeft) || 6;
  const eCell = (board.getBoundingClientRect().width - pad * 2 - 2 * 8) / 9;
  const el = document.createElement('div');
  el.className = 'score-float';
  el.textContent = text;
  el.style.left = `${pad + col * (eCell + 2) + eCell / 2}px`;
  el.style.top = `${pad + row * (eCell + 2)}px`;
  board.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── Overlays ──
export function showGameOver() {
  const ov = $('#game-over-overlay');
  $('#final-score').textContent = state.score;
  $('#final-high').textContent = state.highScore;
  const old = ov.querySelector('.new-record-label');
  if (old) old.remove();
  if (state.score >= state.highScore && state.score > 0) {
    const l = document.createElement('div');
    l.className = 'new-record-label';
    l.textContent = '🎉 Kỷ lục mới!';
    ov.querySelector('.game-over-high').after(l);
  }
  // Show/hide load checkpoint button
  const cpBtn = $('#load-checkpoint-btn');
  if (cpBtn) {
    const hasAny = [0, 1, 2].some(i => localStorage.getItem('lines97_checkpoint_' + i));
    cpBtn.style.display = hasAny ? '' : 'none';
  }
  ov.classList.add('visible');
}

export function hideGameOver() {
  $('#game-over-overlay').classList.remove('visible');
}

export function showToast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2000);
}

// ── Leaderboard UI ──
export function showLeaderboard(data, highlightScore) {
  const ov = $('#leaderboard-overlay');
  const list = $('#leaderboard-list');
  if (!list) return;
  list.innerHTML = '';
  if (!data.length) {
    list.innerHTML = '<div class="text-center py-8 text-sm text-slate-400 dark:text-slate-500 font-semibold select-none">Chưa có dữ liệu</div>';
  } else {
    data.forEach((e, i) => {
      const item = document.createElement('div');
      item.className = 'lb-item flex items-center justify-between p-3.5 rounded-2xl bg-white/30 dark:bg-slate-900/35 border border-white/40 dark:border-slate-800/40 shadow-sm transition-all duration-300 select-none';
      if (e.score === highlightScore) {
        item.classList.add('highlight-item');
      }
      
      const rank = i + 1;
      let rankBadge = '';
      if (rank === 1) {
        rankBadge = '<span class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-white font-display font-bold text-sm shadow-[0_2px_8px_rgba(245,158,11,0.25)]">🥇</span>';
      } else if (rank === 2) {
        rankBadge = '<span class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-slate-300 to-slate-450 text-white font-display font-bold text-sm shadow-[0_2px_8px_rgba(148,163,184,0.25)]">🥈</span>';
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
        : `<span class="material-icons-round text-slate-400 dark:text-slate-500 text-3xl">account_circle</span>`;
      
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
  ov.classList.add('visible');
}

export function hideLeaderboard() {
  $('#leaderboard-overlay').classList.remove('visible');
}

// ── Checkpoint UI ──
export function renderCheckpointSlots() {
  for (let i = 0; i < 3; i++) {
    const raw = localStorage.getItem('lines97_checkpoint_' + i);
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

// ── Real-time Path Preview ──
export function clearPath() {
  $$('.cell').forEach(cell => {
    cell.classList.remove('path-cell');
  });
}

export function drawPath(path, colorVal) {
  clearPath();
  if (!path) return;
  const pal = PALETTES[state.palette].colors[colorVal - 1];
  const pathColor = pal ? pal.main : 'var(--primary-pink)';
  
  path.forEach((pt, index) => {
    if (index === 0) return; // Skip start cell (ball is already there)
    const cell = getCell(pt.row, pt.col);
    if (cell) {
      cell.classList.add('path-cell');
      cell.style.setProperty('--path-color', pathColor);
      cell.style.setProperty('--path-delay', `${index * 35}ms`);
    }
  });
}
