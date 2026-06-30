import { SIZE, THEMES } from '../core/constants.js';
import { state } from '../core/state.js';
import { spriteCache } from './spritecache.js';
import { screenTransform } from '../fx/camera.js';
import { particleSystem } from '../fx/particles.js';

/**
 * Convert hex color (#RRGGBB) to rgba string with given alpha.
 */
function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

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

	// Draw call counter for profiler
	drawCallCount: 0,

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
		this.drawCallCount = 0;

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

		// 9. Draw smoothly moving ball on top of everything
		this._drawMovingBall();

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

				// Draw hover cell highlight — subtle theme-aware glow
				if (this.hoveredCell && this.hoveredCell.row === r && this.hoveredCell.col === c) {
					const theme = THEMES[state.theme] || THEMES.classic;
					const cellBallColor = state.board[r][c] > 0
						? (theme.balls[state.board[r][c] - 1]?.main || '#FF7597')
						: '#FF7597';

					this.ctx.save();

					// Soft fill glow
					this.ctx.beginPath();
					this.ctx.roundRect(x, y, size, size, 8);
					const grad = this.ctx.createRadialGradient(
						x + size / 2, y + size / 2, 2,
						x + size / 2, y + size / 2, size * 0.7
					);
					grad.addColorStop(0, hexToRgba(cellBallColor, 0.18));
					grad.addColorStop(1, hexToRgba(cellBallColor, 0.04));
					this.ctx.fillStyle = grad;
					this.ctx.fill();

					// Subtle pulsing border
					const pulse = 0.5 + Math.sin(this.pathPulseTime * 3) * 0.3;
					this.ctx.beginPath();
					this.ctx.roundRect(x, y, size, size, 8);
					this.ctx.strokeStyle = hexToRgba(cellBallColor, 0.2 * pulse);
					this.ctx.lineWidth = 1.5;
					this.ctx.stroke();

					this.ctx.restore();
				}

				// Draw selected cell highlight — brighter border glow
				if (state.selected && state.selected.row === r && state.selected.col === c) {
					const theme = THEMES[state.theme] || THEMES.classic;
					const cellBallColor = state.board[r][c] > 0
						? (theme.balls[state.board[r][c] - 1]?.main || '#FF7597')
						: '#FF7597';

					this.ctx.save();

					// Soft fill glow — slightly stronger than hover
					this.ctx.beginPath();
					this.ctx.roundRect(x, y, size, size, 8);
					const grad = this.ctx.createRadialGradient(
						x + size / 2, y + size / 2, 2,
						x + size / 2, y + size / 2, size * 0.7
					);
					grad.addColorStop(0, hexToRgba(cellBallColor, 0.25));
					grad.addColorStop(1, hexToRgba(cellBallColor, 0.06));
					this.ctx.fillStyle = grad;
					this.ctx.fill();

					// Brighter pulsing border
					const pulse = 0.6 + Math.sin(this.pathPulseTime * 3) * 0.3;
					this.ctx.beginPath();
					this.ctx.roundRect(x, y, size, size, 8);
					this.ctx.strokeStyle = hexToRgba(cellBallColor, 0.5 * pulse);
					this.ctx.lineWidth = 2;
					this.ctx.shadowColor = cellBallColor;
					this.ctx.shadowBlur = 12;
					this.ctx.stroke();

					this.ctx.restore();
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

				let scale = 0.85;
				let offsetX = 0;
				let offsetY = 0;

				// Selected — subtle lift like hover
				const isSelected = state.selected && state.selected.row === r && state.selected.col === c;
				if (isSelected) {
					offsetY = -2;
				}

				// Hover — subtle lift + glow
				const isHovered = this.hoveredCell && this.hoveredCell.row === r && this.hoveredCell.col === c;
				if (isHovered) {
					scale *= 1.06;
					offsetY = -2;
				}

				// Danger Alert: shake + desaturate if next spawn blocks crucial path
				const isNextSpawnCrucial = state.nextBalls.some(nb => nb.row === r && nb.col === c);
				if (isNextSpawnCrucial) {
					const angle = this.pathPulseTime * 5;
					offsetX = Math.sin(angle) * 1.5;
					offsetY = Math.cos(angle) * 1.5;
				}

				const ballWidth = size * scale;
				const offset = (size - ballWidth) / 2;
				const stateIndex = spriteCache.scaleToState(scale);
				const ballSprite = spriteCache.balls[color]?.[stateIndex];
				if (!ballSprite) continue;

				// Hover — subtle lift + glow
				if (isHovered && !isSelected) {
					const theme = THEMES[state.theme] || THEMES.classic;
					const ballColor = theme.balls[color - 1];
					const glowColor = ballColor?.glow || 'rgba(255, 117, 151, 0.6)';
					this.ctx.save();
					this.ctx.shadowColor = glowColor;
					this.ctx.shadowBlur = 10;
					this.ctx.drawImage(ballSprite, x + offset + offsetX, y + offset + offsetY, ballWidth, ballWidth);
					this.drawCallCount++;
					this.ctx.restore();

					if (isNextSpawnCrucial) {
						this.ctx.save();
						this.ctx.globalAlpha = 0.35;
						this.ctx.fillStyle = '#A0A0A0';
						this.ctx.beginPath();
						this.ctx.arc(x + offset + offsetX + ballWidth / 2, y + offset + offsetY + ballWidth / 2, ballWidth / 2, 0, Math.PI * 2);
						this.ctx.fill();
						this.ctx.restore();
					}
					continue;
				}

				// Selected — stronger glow + cell border handled in drawGrid
				if (isSelected) {
					const theme = THEMES[state.theme] || THEMES.classic;
					const ballColor = theme.balls[color - 1];
					const glowColor = ballColor?.glow || 'rgba(255, 117, 151, 0.6)';
					this.ctx.save();
					this.ctx.shadowColor = glowColor;
					this.ctx.shadowBlur = 18;
					this.ctx.drawImage(ballSprite, x + offset + offsetX, y + offset + offsetY, ballWidth, ballWidth);
					this.drawCallCount++;
					this.ctx.restore();

					if (isNextSpawnCrucial) {
						this.ctx.save();
						this.ctx.globalAlpha = 0.35;
						this.ctx.fillStyle = '#A0A0A0';
						this.ctx.beginPath();
						this.ctx.arc(x + offset + offsetX + ballWidth / 2, y + offset + offsetY + ballWidth / 2, ballWidth / 2, 0, Math.PI * 2);
						this.ctx.fill();
						this.ctx.restore();
					}
					continue;
				}

				this.ctx.drawImage(ballSprite, x + offset + offsetX, y + offset + offsetY, ballWidth, ballWidth);
				this.drawCallCount++;

				if (isNextSpawnCrucial) {
					this.ctx.save();
					this.ctx.globalAlpha = 0.35;
					this.ctx.fillStyle = '#A0A0A0';
					this.ctx.beginPath();
					this.ctx.arc(
						x + offset + offsetX + ballWidth / 2,
						y + offset + offsetY + ballWidth / 2,
						ballWidth / 2, 0, Math.PI * 2
					);
					this.ctx.fill();
					this.ctx.restore();
				}
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
			this.drawCallCount++;
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
			const intensity = line.cells.length >= 6 ? 2 : 1;
			const glowSprite = spriteCache.glows[line.color]?.[intensity];
			if (!glowSprite) continue;

			// Subtle pulsing glow under each cell in the line
			for (const { row, col } of line.cells) {
				const { x, y } = this.getCellCoords(row, col);
				const gSize = size * 1.1;
				const off = (size - gSize) / 2;

				this.ctx.save();
				this.ctx.globalAlpha = 0.35 + Math.sin(pulseTime * 2) * 0.12;
				this.ctx.drawImage(glowSprite, x + off, y + off, gSize, gSize);
				this.drawCallCount++;
				this.ctx.restore();
			}

			// Gentle traveling shimmer along the line
			const steps = line.cells.length;
			const t = Math.sin(pulseTime * 1.8) * 0.5 + 0.5;
			const maxIdx = steps - 1;
			const pos = t * maxIdx;
			const idx = Math.min(Math.floor(pos), maxIdx - 1);
			const frac = pos - idx;

			if (idx >= 0 && idx <= maxIdx - 1 && idx + 1 < steps) {
				const from = this.getCellCoords(line.cells[idx].row, line.cells[idx].col);
				const to = this.getCellCoords(line.cells[idx + 1].row, line.cells[idx + 1].col);
				const cx = from.x + size / 2 + (to.x - from.x) * frac;
				const cy = from.y + size / 2 + (to.y - from.y) * frac;

				const theme = THEMES[state.theme] || THEMES.classic;
				const ballColor = theme.balls[line.color - 1]?.main || '#FF2D6A';

				this.ctx.save();
				const radius = size * 0.35;
				const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
				gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
				gradient.addColorStop(0.3, ballColor + '88');
				gradient.addColorStop(1, 'transparent');

				this.ctx.globalAlpha = 0.5 + Math.sin(pulseTime * 3) * 0.2;
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
	},

	/**
	 * Draw the ball at its smoothly interpolated position during movement.
	 */
	_drawMovingBall() {
		const anim = window.moveAnim;
		if (!anim || !anim.path || anim.path.length < 2) return;

		const totalSteps = anim.path.length - 1;
		const stepPos = Math.min(anim.progress * totalSteps, totalSteps);
		const stepIdx = Math.min(Math.floor(stepPos), totalSteps - 1);
		const frac = this._easeInOutQuad(stepPos - stepIdx);

		const from = anim.path[stepIdx];
		const to = anim.path[Math.min(stepIdx + 1, totalSteps)];
		if (!from || !to) return;

		const fromPos = this.getCellCoords(from.row, from.col);
		const toPos = this.getCellCoords(to.row, to.col);

		const drawX = fromPos.x + (toPos.x - fromPos.x) * frac;
		const drawY = fromPos.y + (toPos.y - fromPos.y) * frac;

		const size = this.cellSize;
		const scale = 0.88;
		const ballWidth = size * scale;
		const stateIdx = spriteCache.scaleToState(scale);
		const ballSprite = spriteCache.balls[anim.color]?.[stateIdx];
		if (!ballSprite) return;

		// Floating shadow beneath ball
		this.ctx.save();
		this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
		this.ctx.shadowBlur = 8;
		this.ctx.shadowOffsetY = 4;

		this.ctx.drawImage(ballSprite, drawX, drawY, ballWidth, ballWidth);
		this.drawCallCount++;
		this.ctx.restore();
	},

	_easeInOutQuad(t) {
		return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	}
};
