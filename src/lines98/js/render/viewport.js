import { SIZE, THEMES } from '../core/constants.js';
import { state } from '../core/state.js';
import { spriteCache } from './spritecache.js';
import { screenTransform } from '../fx/camera.js';
import { particleSystem } from '../fx/particles.js';
import { checkLines } from '../core/logic.js';

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

  drawGlows() {
    // Scan entire board for potential line setups (4-in-a-row)
    const size = this.cellSize;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const color = state.board[r][c];
        if (color === 0) continue;

        // Check if this cell is part of a 4-in-a-row
        const line = checkLines(r, c, 4);
        if (line.length >= 4) {
          const glowSprite = spriteCache.glows[color];
          if (!glowSprite) continue;

          const { x, y } = this.getCellCoords(r, c);
          
          // Draw glow behind ball centered
          const glowSize = size * 1.5;
          const offset = (size - glowSize) / 2;

          this.ctx.save();
          // Add soft breathing glow pulsing
          this.ctx.globalAlpha = 0.5 + Math.sin(this.pathPulseTime * 1.5) * 0.15;
          this.ctx.drawImage(glowSprite, x + offset, y + offset, glowSize, glowSize);
          this.ctx.restore();
        }
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
