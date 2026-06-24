/* ========================================
   LINES 97 — GAME LOGIC
   ======================================== */
(() => {
  'use strict';

  // ── Constants ──
  const SIZE = 9;
  const NUM_COLORS = 7;
  const MIN_LINE = 5;
  const SPAWN_COUNT = 3;
  const INITIAL_SPAWN = 5;
  const MOVE_STEP_MS = 55;
  const LS_HIGH = 'lines97_highScore';
  const LS_PALETTE = 'lines97_palette';
  const LS_SOUND = 'lines97_sound';

  // ── Palettes ──
  const PALETTES = {
    pastel: {
      name: 'Pastel Ngọt Ngào 🍬',
      colors: [
        { main: '#FF7F8E', light: '#FFB8C1', dark: '#CC5F6E', glow: 'rgba(255,127,142,0.45)' },
        { main: '#7EC8E3', light: '#B4E0F2', dark: '#5A9AB8', glow: 'rgba(126,200,227,0.45)' },
        { main: '#7ED3B2', light: '#B0E8D4', dark: '#56A88A', glow: 'rgba(126,211,178,0.45)' },
        { main: '#FFD166', light: '#FFE3A0', dark: '#CCA040', glow: 'rgba(255,209,102,0.45)' },
        { main: '#B8A9E8', light: '#D4C9F4', dark: '#8E7FC0', glow: 'rgba(184,169,232,0.45)' },
        { main: '#FFB07C', light: '#FFD0AE', dark: '#CC8A5E', glow: 'rgba(255,176,124,0.45)' },
        { main: '#E0D4F0', light: '#F0EAF8', dark: '#B0A0C8', glow: 'rgba(224,212,240,0.45)' },
      ],
    },
    classic: {
      name: 'Classic Retro 🕹️',
      colors: [
        { main: '#EF4444', light: '#FCA5A5', dark: '#B91C1C', glow: 'rgba(239,68,68,0.45)' },
        { main: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8', glow: 'rgba(59,130,246,0.45)' },
        { main: '#22C55E', light: '#86EFAC', dark: '#15803D', glow: 'rgba(34,197,94,0.45)' },
        { main: '#EAB308', light: '#FDE047', dark: '#A16207', glow: 'rgba(234,179,8,0.45)' },
        { main: '#D946EF', light: '#F0ABFC', dark: '#A21CAF', glow: 'rgba(217,70,239,0.45)' },
        { main: '#06B6D4', light: '#67E8F9', dark: '#0E7490', glow: 'rgba(6,182,212,0.45)' },
        { main: '#A3715B', light: '#D4A68E', dark: '#78503F', glow: 'rgba(163,113,91,0.45)' },
      ],
    },
    neon: {
      name: 'Neon Glow 💡',
      colors: [
        { main: '#FF2D6A', light: '#FF7FA3', dark: '#C41E50', glow: 'rgba(255,45,106,0.55)' },
        { main: '#00D4FF', light: '#66E5FF', dark: '#009EBF', glow: 'rgba(0,212,255,0.55)' },
        { main: '#00FF87', light: '#66FFB3', dark: '#00BF65', glow: 'rgba(0,255,135,0.55)' },
        { main: '#FFE600', light: '#FFF066', dark: '#BFAC00', glow: 'rgba(255,230,0,0.55)' },
        { main: '#BF00FF', light: '#D966FF', dark: '#8F00BF', glow: 'rgba(191,0,255,0.55)' },
        { main: '#FF8C00', light: '#FFB366', dark: '#BF6900', glow: 'rgba(255,140,0,0.55)' },
        { main: '#F0F0F0', light: '#FFFFFF', dark: '#C0C0C0', glow: 'rgba(240,240,240,0.55)' },
      ],
    },
    fruit: {
      name: 'Trái Cây Tươi 🍓',
      colors: [
        { main: '#E74C3C', light: '#F1948A', dark: '#B03A2E', glow: 'rgba(231,76,60,0.45)' },
        { main: '#5B7FDE', light: '#95AEED', dark: '#3D5BBF', glow: 'rgba(91,127,222,0.45)' },
        { main: '#58D68D', light: '#A3E4BF', dark: '#2EAA62', glow: 'rgba(88,214,141,0.45)' },
        { main: '#F4A623', light: '#F8CA72', dark: '#C4841A', glow: 'rgba(244,166,35,0.45)' },
        { main: '#AF7AC5', light: '#D2B4DE', dark: '#7D3C98', glow: 'rgba(175,122,197,0.45)' },
        { main: '#F0876A', light: '#F5B7A5', dark: '#C26A50', glow: 'rgba(240,135,106,0.45)' },
        { main: '#F7DC6F', light: '#FAEAA7', dark: '#D4B83E', glow: 'rgba(247,220,111,0.45)' },
      ],
    },
  };

  // ── Sound Manager (Web Audio API) ──
  const Sound = {
    ctx: null,
    enabled: true,

    init() {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) { this.enabled = false; }
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    _tone(freq, duration, type = 'sine', vol = 0.15, fadeOut = 0.08) {
      if (!this.enabled || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + duration);
    },

    select() {
      this._tone(880, 0.1, 'sine', 0.12);
      setTimeout(() => this._tone(1100, 0.08, 'sine', 0.08), 40);
    },

    deselect() {
      this._tone(500, 0.08, 'sine', 0.08);
    },

    moveStep() {
      this._tone(600 + Math.random() * 200, 0.04, 'triangle', 0.05);
    },

    land() {
      this._tone(350, 0.12, 'sine', 0.1);
      this._tone(280, 0.15, 'triangle', 0.06);
    },

    lineClear(count) {
      const notes = [523, 659, 784, 988, 1175, 1318, 1568];
      for (let i = 0; i < Math.min(count, notes.length); i++) {
        setTimeout(() => this._tone(notes[i], 0.2, 'sine', 0.1), i * 70);
      }
    },

    spawn() {
      [0, 80, 160].forEach((d, i) =>
        setTimeout(() => this._tone(440 + i * 60, 0.1, 'triangle', 0.06), d)
      );
    },

    noPath() {
      this._tone(200, 0.15, 'square', 0.06);
      setTimeout(() => this._tone(170, 0.15, 'square', 0.06), 100);
    },

    gameOver() {
      [400, 350, 300, 250].forEach((f, i) =>
        setTimeout(() => this._tone(f, 0.35, 'sine', 0.1), i * 180)
      );
    },

    newRecord() {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => this._tone(f, 0.25, 'sine', 0.12), i * 120)
      );
    },
  };

  // ── DOM Helpers ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ── Game State ──
  const state = {
    board: [],            // 2D array [row][col] → 0 (empty) or 1–7 (color)
    score: 0,
    highScore: 0,
    nextBalls: [],        // [{color, row, col}] — 3 upcoming balls
    selected: null,       // {row, col} or null
    animating: false,
    gameOver: false,
    palette: 'pastel',
  };

  // ── Initialize ──
  function init() {
    loadSettings();
    Sound.init();
    buildBoard();
    buildPalettePanel();
    applyPalette(state.palette);
    setupEvents();
    startNewGame();
  }

  function loadSettings() {
    state.highScore = parseInt(localStorage.getItem(LS_HIGH)) || 0;
    state.palette = localStorage.getItem(LS_PALETTE) || 'pastel';
    const soundPref = localStorage.getItem(LS_SOUND);
    Sound.enabled = soundPref === null ? true : soundPref === 'true';
  }

  function saveHighScore() {
    localStorage.setItem(LS_HIGH, state.highScore);
  }

  // ── Board DOM ──
  function buildBoard() {
    const board = $('#game-board');
    board.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        board.appendChild(cell);
      }
    }
  }

  function getCell(r, c) {
    return $(`.cell[data-row="${r}"][data-col="${c}"]`);
  }

  // ── Palette ──
  function buildPalettePanel() {
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
      opt.addEventListener('click', () => selectPalette(key));
      inner.appendChild(opt);
    }
    panel.appendChild(inner);
  }

  function selectPalette(key) {
    state.palette = key;
    localStorage.setItem(LS_PALETTE, key);
    applyPalette(key);
    $$('.palette-option').forEach(o =>
      o.classList.toggle('active', o.dataset.palette === key)
    );
    renderBoard();
    renderPreview();
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

  // ── Game Logic ──
  function startNewGame() {
    state.board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    state.score = 0;
    state.selected = null;
    state.animating = false;
    state.gameOver = false;
    generateNextBalls();
    spawnBalls(INITIAL_SPAWN);
    generateNextBalls();
    renderBoard();
    renderPreview();
    renderScore();
    hideGameOver();
  }

  function generateNextBalls() {
    state.nextBalls = [];
    const empties = getEmptyCells();
    // Pre-assign positions for preview (may change if board changes before spawn)
    for (let i = 0; i < SPAWN_COUNT && i < empties.length; i++) {
      const idx = Math.floor(Math.random() * empties.length);
      const pos = empties.splice(idx, 1)[0];
      state.nextBalls.push({
        color: Math.floor(Math.random() * NUM_COLORS) + 1,
        row: pos.row,
        col: pos.col,
      });
    }
  }

  function getEmptyCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (state.board[r][c] === 0) cells.push({ row: r, col: c });
    return cells;
  }

  function spawnBalls(count) {
    if (count === INITIAL_SPAWN) {
      // Initial spawn: random positions
      const empties = getEmptyCells();
      for (let i = 0; i < count && empties.length > 0; i++) {
        const idx = Math.floor(Math.random() * empties.length);
        const pos = empties.splice(idx, 1)[0];
        const color = Math.floor(Math.random() * NUM_COLORS) + 1;
        state.board[pos.row][pos.col] = color;
      }
    } else {
      // Spawn from nextBalls (adjust positions if occupied)
      const toSpawn = [];
      for (const ball of state.nextBalls) {
        if (state.board[ball.row][ball.col] === 0) {
          toSpawn.push(ball);
        } else {
          // Find a new random empty cell
          const empties = getEmptyCells().filter(
            e => !toSpawn.some(s => s.row === e.row && s.col === e.col)
          );
          if (empties.length > 0) {
            const pos = empties[Math.floor(Math.random() * empties.length)];
            toSpawn.push({ color: ball.color, row: pos.row, col: pos.col });
          }
        }
      }
      for (const b of toSpawn) {
        state.board[b.row][b.col] = b.color;
      }
    }
  }

  // ── BFS Pathfinding ──
  function findPath(sr, sc, er, ec) {
    if (sr === er && sc === ec) return [{ row: sr, col: sc }];
    if (state.board[er][ec] !== 0) return null;

    const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const parent = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    visited[sr][sc] = true;
    const queue = [{ row: sr, col: sc }];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
      const cur = queue.shift();
      for (const [dr, dc] of dirs) {
        const nr = cur.row + dr, nc = cur.col + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if (visited[nr][nc]) continue;
        if (state.board[nr][nc] !== 0 && !(nr === er && nc === ec)) continue;
        // Actually the destination must be empty (board[er][ec] === 0 checked above)
        if (state.board[nr][nc] !== 0) continue;
        visited[nr][nc] = true;
        parent[nr][nc] = cur;
        if (nr === er && nc === ec) {
          // Reconstruct path
          const path = [];
          let node = { row: er, col: ec };
          while (node) {
            path.unshift(node);
            node = parent[node.row][node.col];
          }
          return path;
        }
        queue.push({ row: nr, col: nc });
      }
    }
    return null;
  }

  // ── Line Detection ──
  function checkLines(row, col) {
    const color = state.board[row][col];
    if (!color) return [];

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    const toRemove = new Set();

    for (const [dr, dc] of directions) {
      const line = [`${row},${col}`];
      // Positive direction
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === color) {
        line.push(`${r},${c}`);
        r += dr; c += dc;
      }
      // Negative direction
      r = row - dr; c = col - dc;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state.board[r][c] === color) {
        line.push(`${r},${c}`);
        r -= dr; c -= dc;
      }
      if (line.length >= MIN_LINE) {
        line.forEach(k => toRemove.add(k));
      }
    }

    return [...toRemove].map(k => {
      const [r, c] = k.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  function checkAllNewBalls(positions) {
    const allRemove = new Set();
    for (const pos of positions) {
      const line = checkLines(pos.row, pos.col);
      line.forEach(p => allRemove.add(`${p.row},${p.col}`));
    }
    return [...allRemove].map(k => {
      const [r, c] = k.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  function calculateScore(count) {
    // 5 = 10, 6 = 24, 7 = 42, 8 = 64, 9 = 90
    return count * 2 * (count - 4);
  }

  // ── Cell Click Handler ──
  async function onCellClick(row, col) {
    if (state.animating || state.gameOver) return;
    Sound.resume();

    const value = state.board[row][col];

    // Clicked on a ball
    if (value !== 0) {
      if (state.selected && state.selected.row === row && state.selected.col === col) {
        // Deselect
        state.selected = null;
        Sound.deselect();
        renderBoard();
      } else {
        // Select this ball
        state.selected = { row, col };
        Sound.select();
        renderBoard();
      }
      return;
    }

    // Clicked on empty cell — need a selected ball
    if (!state.selected) return;

    const path = findPath(state.selected.row, state.selected.col, row, col);
    if (!path) {
      Sound.noPath();
      const cell = getCell(row, col);
      cell.classList.add('no-path');
      setTimeout(() => cell.classList.remove('no-path'), 400);
      return;
    }

    // Perform move
    state.animating = true;
    const fromR = state.selected.row, fromC = state.selected.col;
    const color = state.board[fromR][fromC];
    state.board[fromR][fromC] = 0;
    state.selected = null;
    renderBoard();

    // Animate move
    await animateMove(path, color);

    // Place ball at destination
    state.board[row][col] = color;
    renderBoard();
    Sound.land();

    // Check for lines at destination
    const removed = checkLines(row, col);
    if (removed.length > 0) {
      await removeWithEffect(removed);
      state.animating = false;
    } else {
      // Spawn new balls
      spawnBalls(SPAWN_COUNT);
      renderBoard();
      Sound.spawn();

      // Animate spawn
      await animateSpawn();

      // Check lines from newly spawned balls
      const spawnRemoved = checkAllNewBalls(
        state.nextBalls.filter(b => state.board[b.row]?.[b.col])
      );
      if (spawnRemoved.length > 0) {
        await removeWithEffect(spawnRemoved);
      }

      generateNextBalls();
      renderPreview();

      // Check game over
      if (getEmptyCells().length === 0) {
        state.gameOver = true;
        state.animating = false;
        Sound.gameOver();
        showGameOver();
        return;
      }
      state.animating = false;
    }
  }

  // ── Animations ──
  async function animateMove(path, color) {
    const board = $('#game-board');
    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / SIZE;
    const padding = parseFloat(getComputedStyle(board).paddingLeft) || 6;
    const gap = 2;
    const effectiveCell = (boardRect.width - padding * 2 - gap * 8) / 9;

    const ghost = document.createElement('div');
    ghost.className = `ghost-ball ball-${color}`;

    function posAt(r, c) {
      const x = padding + c * (effectiveCell + gap) + (effectiveCell - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ball-size'))) / 2;
      const y = padding + r * (effectiveCell + gap) + (effectiveCell - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ball-size'))) / 2;
      ghost.style.left = `${padding + c * (effectiveCell + gap) + effectiveCell / 2 - ghost.offsetWidth / 2}px`;
      ghost.style.top = `${padding + r * (effectiveCell + gap) + effectiveCell / 2 - ghost.offsetHeight / 2}px`;
    }

    // Compute ball size from CSS variable
    const rootStyles = getComputedStyle(document.documentElement);
    const ballSizePx = effectiveCell * 0.72;
    ghost.style.width = `${ballSizePx}px`;
    ghost.style.height = `${ballSizePx}px`;

    board.appendChild(ghost);

    // Position at start
    const startR = path[0].row, startC = path[0].col;
    ghost.style.left = `${padding + startC * (effectiveCell + gap) + (effectiveCell - ballSizePx) / 2}px`;
    ghost.style.top = `${padding + startR * (effectiveCell + gap) + (effectiveCell - ballSizePx) / 2}px`;

    // Force reflow
    ghost.offsetHeight;

    for (let i = 1; i < path.length; i++) {
      const { row: r, col: c } = path[i];
      ghost.style.left = `${padding + c * (effectiveCell + gap) + (effectiveCell - ballSizePx) / 2}px`;
      ghost.style.top = `${padding + r * (effectiveCell + gap) + (effectiveCell - ballSizePx) / 2}px`;
      Sound.moveStep();
      await delay(MOVE_STEP_MS);
    }

    ghost.remove();
  }

  async function animateSpawn() {
    const balls = $$('.ball.spawning');
    if (balls.length) await delay(350);
  }

  async function removeWithEffect(positions) {
    const points = calculateScore(positions.length);
    state.score += points;
    const isNewRecord = state.score > state.highScore;
    if (isNewRecord) {
      state.highScore = state.score;
      saveHighScore();
    }

    // Mark balls for explode animation
    for (const { row, col } of positions) {
      const cell = getCell(row, col);
      const ball = cell.querySelector('.ball');
      if (ball) {
        ball.classList.add('exploding');
        createParticles(cell, state.board[row][col]);
      }
    }

    // Show floating score
    if (positions.length > 0) {
      const mid = positions[Math.floor(positions.length / 2)];
      showScoreFloat(mid.row, mid.col, `+${points}`);
    }

    Sound.lineClear(positions.length);

    await delay(450);

    // Remove from board
    for (const { row, col } of positions) {
      state.board[row][col] = 0;
    }

    renderBoard();
    renderScore();

    if (isNewRecord) Sound.newRecord();
  }

  function createParticles(cell, color) {
    const board = $('#game-board');
    const cellRect = cell.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const cx = cellRect.left - boardRect.left + cellRect.width / 2;
    const cy = cellRect.top - boardRect.top + cellRect.height / 2;
    const pal = PALETTES[state.palette].colors[color - 1];

    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.background = pal.main;
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
      const dist = 18 + Math.random() * 22;
      p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
      board.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }
  }

  function showScoreFloat(row, col, text) {
    const board = $('#game-board');
    const boardRect = board.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(board).paddingLeft) || 6;
    const effectiveCell = (boardRect.width - padding * 2 - 2 * 8) / 9;

    const el = document.createElement('div');
    el.className = 'score-float';
    el.textContent = text;
    el.style.left = `${padding + col * (effectiveCell + 2) + effectiveCell / 2}px`;
    el.style.top = `${padding + row * (effectiveCell + 2)}px`;
    board.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ── Rendering ──
  function renderBoard() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = getCell(r, c);
        // Clear old ball
        const old = cell.querySelector('.ball');
        if (old) old.remove();

        const val = state.board[r][c];
        if (val) {
          const ball = document.createElement('div');
          ball.className = `ball ball-${val}`;
          if (state.selected && state.selected.row === r && state.selected.col === c) {
            ball.classList.add('selected');
          }
          cell.appendChild(ball);
        }
      }
    }
  }

  function renderPreview() {
    const container = $('#next-preview');
    container.innerHTML = '';
    for (const nb of state.nextBalls) {
      const dot = document.createElement('div');
      dot.className = `preview-ball ball-${nb.color}`;
      container.appendChild(dot);
    }
  }

  function renderScore() {
    const scoreEl = $('#score');
    const highEl = $('#high-score');
    scoreEl.textContent = state.score;
    highEl.textContent = state.highScore;

    // Bump animation
    scoreEl.classList.add('bump');
    setTimeout(() => scoreEl.classList.remove('bump'), 300);
  }

  function showGameOver() {
    const overlay = $('#game-over-overlay');
    $('#final-score').textContent = state.score;
    $('#final-high').textContent = state.highScore;

    // Check for new record
    const recordEl = overlay.querySelector('.new-record-label');
    if (recordEl) recordEl.remove();
    if (state.score >= state.highScore && state.score > 0) {
      const label = document.createElement('div');
      label.className = 'new-record-label';
      label.textContent = '🎉 Kỷ lục mới!';
      overlay.querySelector('.game-over-high').after(label);
    }

    overlay.classList.add('visible');
  }

  function hideGameOver() {
    $('#game-over-overlay').classList.remove('visible');
  }

  // ── Events ──
  function setupEvents() {
    // Board clicks
    $('#game-board').addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);
      onCellClick(r, c);
    });

    // New game
    $('#new-game-btn').addEventListener('click', () => {
      Sound.resume();
      startNewGame();
    });

    // Restart (game over)
    $('#restart-btn').addEventListener('click', () => {
      Sound.resume();
      startNewGame();
    });

    // Sound toggle
    const soundBtn = $('#sound-toggle');
    updateSoundUI();
    soundBtn.addEventListener('click', () => {
      Sound.enabled = !Sound.enabled;
      localStorage.setItem(LS_SOUND, Sound.enabled);
      updateSoundUI();
      if (Sound.enabled) {
        Sound.resume();
        Sound.select();
      }
    });

    // Palette toggle
    const palBtn = $('#palette-toggle');
    palBtn.addEventListener('click', () => {
      const panel = $('#palette-panel');
      panel.classList.toggle('open');
      palBtn.classList.toggle('active');
    });
  }

  function updateSoundUI() {
    const icon = $('#sound-icon');
    const label = $('#sound-label');
    const btn = $('#sound-toggle');
    if (Sound.enabled) {
      icon.textContent = 'volume_up';
      label.textContent = 'Âm thanh';
      btn.classList.remove('muted');
    } else {
      icon.textContent = 'volume_off';
      label.textContent = 'Tắt tiếng';
      btn.classList.add('muted');
    }
  }

  // ── Utility ──
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
