import { SIZE, THEMES } from '../core/constants.js';
import { state } from '../core/state.js';
import { spriteCache } from './spritecache.js';
import { screenTransform } from '../fx/camera.js';
import { particleSystem } from '../fx/particles.js';

export const viewport = {
  canvas: null,
  ctx: null,
  
  // Layout metrics calculated on resize
  width: 0,
  height: 0,
  gridSize: 0,
  cellSize: 0,
  gap: 5,
  startX: 0,
  startY: 0,
  
  // Interaction hover state
  hoveredCell: null,
  
  // Path preview line animation pulsing
  pathPulseTime: 0,

  initialize(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.resize();
  },

  resize() {
    if (!this.canvas) return;

    // Get responsive container dimensions
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Base layout size (e.g. max 420px matching mobile styles)
    const baseSize = Math.min(rect.width, 420);
    
    this.width = baseSize;
    this.height = baseSize;

    // Set canvas dimensions scaled by DPR for Retina display sharpness
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Calculate grid coordinate parameters (responsive 9x9 layout)
    this.gridSize = baseSize;
    this.gap = 5;
    this.cellSize = (this.gridSize - (SIZE + 1) * this.gap) / SIZE;
    this.startX = 0;
    this.startY = 0;

    // Reset spriteCache since devicePixelRatio might have changed
    spriteCache.initialize(state.theme);
  },

  getCellCoords(row, col) {
    const x = this.startX + this.gap + col * (this.cellSize + this.gap);
    const y = this.startY + this.gap + row * (this.cellSize + this.gap);
    return { x, y };
  },

  getCellFromPixels(pixelX, pixelY) {
    const localX = pixelX - this.startX;
    const localY = pixelY - this.startY;

    const col = Math.floor((localX - this.gap) / (this.cellSize + this.gap));
    const row = Math.floor((localY - this.gap) / (this.cellSize + this.gap));

    if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) {
      return { row, col };
    }
    return null;
  },

  draw(dt) {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Update fx/timing variables
    this.pathPulseTime += 0.05 * (dt / 16.67);

    // 2. Apply 2.5D Screen Transform
    screenTransform.apply(this.ctx, this.width, this.height);

    // 3. Draw Board Background Grid
    const theme = THEMES[state.theme] || THEMES.classic;
    this.drawGrid(theme);

    // 4. Draw Glow Halos (P1: Potential Line Setup)
    this.drawGlows();

    // 5. Draw Ghosts (P0: 30% Opacity Spawn Preview)
    this.drawGhosts();

    // 6. Draw Balls (Selected Pulse & Shakes)
    this.drawBalls();

    // 7. Draw Dynamic Path Preview (P0: Glowing neon line)
    if (state.selected && this.hoveredCell && window.currentPath) {
      this.drawPath(window.currentPath);
    }

    // 8. Draw Particles
    particleSystem.render(this.ctx);

    // Restore Transform Matrix
    screenTransform.restore(this.ctx);
  },

  drawGrid(theme) {
    const size = this.cellSize;
    
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const { x, y } = this.getCellCoords(r, c);

        // Rounded Rect for cells
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 8);
        this.ctx.fillStyle = theme.board.cellBg;
        this.ctx.fill();
        
        // Border
        this.ctx.strokeStyle = theme.board.gridLine;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw hover cell highlight
        if (this.hoveredCell && this.hoveredCell.row === r && this.hoveredCell.col === c) {
          this.ctx.beginPath();
          this.ctx.roundRect(x, y, size, size, 8);
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          this.ctx.fill();
        }
      }
    }
  },

  drawBalls() {
    const size = this.cellSize;
    
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const color = state.board[r][c];
        if (color === 0) continue;

        const { x, y } = this.getCellCoords(r, c);
        const ballSprite = spriteCache.balls[color];
        if (!ballSprite) continue;

        let scale = 0.85;
        let offsetX = 0;
        let offsetY = 0;

        // Selected Pulse animation (sin-wave deterministic)
        if (state.selected && state.selected.row === r && state.selected.col === c) {
          scale = 0.85 + Math.sin(this.pathPulseTime * 2.5) * 0.08;
        }

        // Danger Alert Ball shake (if next spawn breaks setup)
        const isNextSpawnCrucial = state.nextBalls.some(nb => nb.row === r && nb.col === c);
        if (isNextSpawnCrucial) {
          // Desaturate slightly (via globalAlpha or overlay, here we shake)
          const angle = this.pathPulseTime * 5;
          offsetX = Math.sin(angle) * 1.5;
          offsetY = Math.cos(angle) * 1.5;
        }

        const ballWidth = size * scale;
        const offset = (size - ballWidth) / 2;

        this.ctx.drawImage(
          ballSprite,
          x + offset + offsetX,
          y + offset + offsetY,
          ballWidth,
          ballWidth
        );
      }
    }
  },

  drawGhosts() {
    const size = this.cellSize;
    for (const b of state.nextBalls) {
      if (state.board[b.row][b.col] !== 0) continue; // Spawn cell is blocked

      const { x, y } = this.getCellCoords(b.row, b.col);
      const ghostSprite = spriteCache.ghosts[b.color];
      if (!ghostSprite) continue;

      const ballWidth = size * 0.7; // Smaller ghost balls
      const offset = (size - ballWidth) / 2;

      this.ctx.drawImage(ghostSprite, x + offset, y + offset, ballWidth, ballWidth);
    }
  },

  /**
   * Find all unique near-complete lines (4-in-a-row) on the board.
   * Returns deduplicated array of { cells: [{row,col},...], color }.
   */
  _findNearCompleteLines() {
    const found = [];
    const seen = new Set();
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const color = state.board[r][c];
        if (color === 0) continue;

        for (const [dr, dc] of dirs) {
          const cells = [{ row: r, col: c }];

          // Scan forward
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && state.board[rr][cc] === color) {
            cells.push({ row: rr, col: cc });
            rr += dr;
            cc += dc;
          }
          // Scan backward
          rr = r - dr; cc = c - dc;
          while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && state.board[rr][cc] === color) {
            cells.unshift({ row: rr, col: cc });
            rr -= dr;
            cc -= dc;
          }

          if (cells.length >= 4) {
            // Create a deterministic key for deduplication
            const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
            const key = sorted.map(p => `${p.row},${p.col}`).join('|');
            if (!seen.has(key)) {
              seen.add(key);
              // Order cells from one end to the other for streak animation
              const isHorizontal = cells.every(p => p.row === cells[0].row);
              if (isHorizontal) cells.sort((a, b) => a.col - b.col);
              else cells.sort((a, b) => a.row - b.row);
              found.push({ cells, color });
            }
          }
        }
      }
    }
    return found;
  },

  drawGlows() {
    const uniqueLines = this._findNearCompleteLines();
    if (uniqueLines.length === 0) return;

    const size = this.cellSize;
    const pulseTime = this.pathPulseTime;

    for (const line of uniqueLines) {
      const glowSprite = spriteCache.glows[line.color];
      if (!glowSprite) continue;

      // 1. Static pulsing glow on every cell of the line
      for (const { row, col } of line.cells) {
        const { x, y } = this.getCellCoords(row, col);
        const glowSize = size * 1.5;
        const offset = (size - glowSize) / 2;

        this.ctx.save();
        this.ctx.globalAlpha = 0.5 + Math.sin(pulseTime * 1.5) * 0.15;
        this.ctx.drawImage(glowSprite, x + offset, y + offset, glowSize, glowSize);
        this.ctx.restore();
      }

      // 2. Chasing light streak along the line (ping-pong)
      const steps = line.cells.length;
      // Ping-pong: φ ∈ [0, π] → t ∈ [0, 1 → 0]
      const t = Math.sin(pulseTime * 2) * 0.5 + 0.5;
      // Clamp to avoid overshoot at endpoints
      const maxIdx = steps - 1;
      const pos = t * maxIdx;
      const idx = Math.min(Math.floor(pos), maxIdx - 1);
      const frac = pos - idx;

      if (idx >= 0 && idx <= maxIdx - 1) {
        const from = this.getCellCoords(line.cells[idx].row, line.cells[idx].col);
        const to = this.getCellCoords(line.cells[idx + 1].row, line.cells[idx + 1].col);
        const cx = from.x + size / 2 + (to.x - from.x) * frac;
        const cy = from.y + size / 2 + (to.y - from.y) * frac;

        // Resolve theme color
        const theme = THEMES[state.theme] || THEMES.classic;
        const ballColor = theme.balls[line.color - 1]?.main || '#FF2D6A';

        // Draw a bright glowing spot
        this.ctx.save();
        const radius = size * 0.55;
        const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, ballColor);
        gradient.addColorStop(0.6, ballColor + '88');
        gradient.addColorStop(1, 'transparent');

        this.ctx.globalAlpha = 0.6 + Math.sin(pulseTime * 4) * 0.25;
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  },

  drawPath(path) {
    if (path.length < 2) return;

    this.ctx.save();

    // 1. Path Line styles
    this.ctx.beginPath();
    
    // Draw neon trail path lines
    const startCell = this.getCellCoords(path[0].row, path[0].col);
    this.ctx.moveTo(startCell.x + this.cellSize / 2, startCell.y + this.cellSize / 2);

    for (let i = 1; i < path.length; i++) {
      const cell = this.getCellCoords(path[i].row, path[i].col);
      this.ctx.lineTo(cell.x + this.cellSize / 2, cell.y + this.cellSize / 2);
    }

    // Neon glowing styles
    const theme = THEMES[state.theme] || THEMES.classic;
    const activeColor = theme.balls[state.board[path[0].row][path[0].col] - 1]?.main || '#FF2D6A';
    
    this.ctx.strokeStyle = activeColor;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.shadowColor = activeColor;
    this.ctx.shadowBlur = 8 + Math.sin(this.pathPulseTime * 4) * 3; // Breathing pulse shadow

    this.ctx.stroke();

    // 2. Pulse target cell marker
    const targetCell = path[path.length - 1];
    const { x, y } = this.getCellCoords(targetCell.row, targetCell.col);
    this.ctx.beginPath();
    const markerRadius = (this.cellSize / 4) + Math.sin(this.pathPulseTime * 4) * 2;
    this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, markerRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = activeColor;
    this.ctx.shadowBlur = 10;
    this.ctx.fill();

    this.ctx.restore();
  }
};
