// ── Lines 97 — Rendering & Animations ──
import { SIZE, PALETTES, MOVE_STEP_MS } from './constants.js';
import { state } from './state.js';
import { Sound } from './sound.js';
import { calculateScore } from './logic.js';

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
      // Clear hint classes
      cell.classList.remove('hint-src', 'hint-dst');
      const val = state.board[r][c];
      if (val) {
        const ball = document.createElement('div');
        ball.className = `ball ball-${val}`;
        if (state.selected && state.selected.row === r && state.selected.col === c)
          ball.classList.add('selected');
        cell.appendChild(ball);
      }
    }
}

export function renderPreview() {
  const c = $('#next-preview');
  c.innerHTML = '';
  for (const nb of state.nextBalls) {
    const d = document.createElement('div');
    d.className = `preview-ball ball-${nb.color}`;
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
  const panel = $('#palette-panel');
  const inner = document.createElement('div');
  inner.className = 'palette-panel-inner';
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
      dot.style.background = c.main;
      preview.appendChild(dot);
    });
    opt.appendChild(name);
    opt.appendChild(preview);
    inner.appendChild(opt);
  }
  panel.appendChild(inner);
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
  if (isNew) { state.highScore = state.score; localStorage.setItem('lines97_highScore', state.highScore); }

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
  const count = window.innerWidth <= 480 ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${cx}px`; p.style.top = `${cy}px`;
    p.style.background = pal.main;
    const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const d = 18 + Math.random() * 22;
    p.style.setProperty('--px', `${Math.cos(a) * d}px`);
    p.style.setProperty('--py', `${Math.sin(a) * d}px`);
    board.appendChild(p);
    setTimeout(() => p.remove(), 600);
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
  const body = $('#leaderboard-body');
  body.innerHTML = '';
  if (!data.length) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Chưa có dữ liệu</td></tr>';
  } else {
    data.forEach((e, i) => {
      const tr = document.createElement('tr');
      if (e.score === highlightScore) tr.classList.add('highlight');
      const d = new Date(e.date);
      tr.innerHTML = `<td>${i + 1}</td><td>${e.score}</td><td>${e.moves || '-'}</td><td>${d.toLocaleDateString('vi')}</td>`;
      body.appendChild(tr);
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
