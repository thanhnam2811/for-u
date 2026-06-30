import { state } from '../core/state.js';
import { generateHeatmap } from '../core/replay.js';

/**
 * Session Analytics & Heatmap.
 *
 * Collects performance stats after GameOver and renders
 * a heatmap overlay showing hot zones on the board.
 */
export const analytics = {
	/**
	 * Compute derived stats from current game state.
	 */
	computeStats() {
		const { turn, score, ballsCleared, totalLinesCleared, longestLine, elapsedTime } = state;

		const efficiency = turn > 0 ? (score / turn).toFixed(1) : '—';
		const avgLine = totalLinesCleared > 0
			? (ballsCleared / totalLinesCleared).toFixed(1)
			: '—';

		const minutes = Math.floor(elapsedTime / 60);
		const seconds = elapsedTime % 60;
		const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

		return {
			turns: turn,
			score,
			ballsCleared,
			totalLinesCleared,
			longestLine,
			efficiency,
			avgLine,
			time: timeStr,
		};
	},

	/**
	 * Render a heatmap into a given canvas element.
	 * @param {HTMLCanvasElement} canvas
	 */
	renderHeatmap(canvas) {
		if (!canvas) return;

		const heatData = generateHeatmap();
		const maxVal = Math.max(1, ...heatData.flat());
		const size = canvas.width;
		const cellSize = size / 9;

		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, size, size);

		// Draw cells
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const val = heatData[r][c] / maxVal; // 0..1
				const x = c * cellSize;
				const y = r * cellSize;

				// Interpolate: blue (cold) → yellow (warm) → red (hot)
				let color;
				if (val < 0.5) {
					const t = val * 2;
					const r2 = Math.round(24 + t * 216);
					const g = Math.round(100 + t * 155);
					const b = Math.round(180 + t * (24 - 180));
					color = `rgba(${r2},${g},${b},0.4)`;
				} else {
					const t = (val - 0.5) * 2;
					const r2 = Math.round(240 + t * 15);
					const g = Math.round(255 - t * 200);
					const b = Math.round(24 - t * 24);
					color = `rgba(${r2},${g},${b},0.4)`;
				}

				ctx.fillStyle = color;
				ctx.fillRect(x, y, cellSize, cellSize);

				// Draw grid lines
				ctx.strokeStyle = 'rgba(255,255,255,0.08)';
				ctx.lineWidth = 0.5;
				ctx.strokeRect(x, y, cellSize, cellSize);

				// Show count if significant
				const count = heatData[r][c];
				if (count > 0) {
					ctx.fillStyle = `rgba(255,255,255,${0.3 + val * 0.5})`;
					ctx.font = `${Math.round(cellSize * 0.35)}px sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(Math.round(count), x + cellSize / 2, y + cellSize / 2);
				}
			}
		}

		// Border
		ctx.strokeStyle = 'rgba(255,255,255,0.15)';
		ctx.lineWidth = 1;
		ctx.strokeRect(0, 0, size, size);
	},
};
