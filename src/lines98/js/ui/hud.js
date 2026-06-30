import { state } from '../core/state.js';
import { Sound } from '../audio/sound.js';

export const hud = {
	scoreEl: null,
	highScoreEl: null,
	timeEl: null,
	movesEl: null,
	clearedEl: null,
	undoBtn: null,
	boardContainer: null,
	pressureOverlay: null,
	heartbeatTimer: 0,

	initialize() {
		this.scoreEl = document.getElementById('score');
		this.highScoreEl = document.getElementById('high-score');
		this.timeEl = document.getElementById('stat-time');
		this.movesEl = document.getElementById('stat-moves');
		this.clearedEl = document.getElementById('stat-cleared');
		this.undoBtn = document.getElementById('undo-btn');
		this.boardContainer = document.getElementById('game-board');

		// Dynamically inject pressure overlay Vignette inside the board container
		if (this.boardContainer && !document.getElementById('pressure-overlay')) {
			this.pressureOverlay = document.createElement('div');
			this.pressureOverlay.id = 'pressure-overlay';
			this.pressureOverlay.className = 'absolute inset-0 pointer-events-none z-20 rounded-[16px] sm:rounded-[22px] opacity-0 transition-opacity duration-500 shadow-[inset_0_0_30px_rgba(239,68,68,0.5)]';
			this.boardContainer.appendChild(this.pressureOverlay);
		} else {
			this.pressureOverlay = document.getElementById('pressure-overlay');
		}

		this.heartbeatTimer = 0;
	},

	update() {
		if (this.scoreEl) this.scoreEl.textContent = state.score;
		if (this.highScoreEl) this.highScoreEl.textContent = state.highScore;

		// Time MM:SS formatting
		if (this.timeEl) {
			const minutes = Math.floor(state.elapsedTime / 60);
			const seconds = state.elapsedTime % 60;
			this.timeEl.textContent = `⏱ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		}

		if (this.movesEl) this.movesEl.textContent = `🎯 ${state.turn}`;
		if (this.clearedEl) this.clearedEl.textContent = `💥 ${state.ballsCleared}`;

		// Update Undo button state
		if (this.undoBtn) {
			this.undoBtn.disabled = state.undoStack.length === 0 || state.animating || state.gameOver;
		}

		// Update Pressure HUD based on board occupancy
		const totalCells = 81;
		const occupiedCells = state.board.flat().filter(cell => cell !== 0).length;
		const occupancy = occupiedCells / totalCells;

		this.updatePressure(occupancy);
	},

	updatePressure(occupancy) {
		if (!this.pressureOverlay || !this.boardContainer) return;

		if (occupancy >= 0.85) {
			// Vignette Active: Red Vignette Pulse + subtle heartbeat rumble
			this.pressureOverlay.style.opacity = '1';
			this.pressureOverlay.className = 'absolute inset-0 pointer-events-none z-20 rounded-[16px] sm:rounded-[22px] transition-all duration-300 shadow-[inset_0_0_35px_rgba(239,68,68,0.65)] animate-pulse';

			// Heartbeat rumble on board container
			this.boardContainer.style.animation = 'heartbeat-rumble 1s infinite';

			// Heartbeat audio — once per second using elapsedTime guard
			if (state.elapsedTime - this.heartbeatTimer >= 1) {
				Sound.heartbeat();
				this.heartbeatTimer = state.elapsedTime;
			}
		} else if (occupancy >= 0.70) {
			// Warning Vignette (soft red glow, no pulse, no shake)
			this.pressureOverlay.style.opacity = '0.6';
			this.pressureOverlay.className = 'absolute inset-0 pointer-events-none z-20 rounded-[16px] sm:rounded-[22px] transition-all duration-500 shadow-[inset_0_0_20px_rgba(239,68,68,0.35)]';
			this.boardContainer.style.animation = 'none';
			this.boardContainer.style.transform = 'none';
		} else {
			// Normal
			this.pressureOverlay.style.opacity = '0';
			this.boardContainer.style.animation = 'none';
			this.boardContainer.style.transform = 'none';
		}
	},

	/**
	 * Spawns a floating text animation on the board to celebrate moves and combos.
	 */
	spawnFloatingText(text, row, col, isCombo = false) {
		if (!this.boardContainer) return;

		const floatingText = document.createElement('div');
		floatingText.textContent = text;

		// Position floating text centered on cell
		const cellWidth = this.boardContainer.clientWidth / 9;
		const x = col * cellWidth + cellWidth / 2;
		const y = row * cellWidth + cellWidth / 2;

		// Premium styling
		floatingText.className = `absolute pointer-events-none z-30 font-display font-bold text-xs sm:text-sm text-center -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${isCombo
				? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] scale-110'
				: 'text-brand-pink dark:text-brand-purple drop-shadow-[0_2px_4px_rgba(255,127,142,0.4)]'
			}`;

		floatingText.style.left = `${x}px`;
		floatingText.style.top = `${y}px`;

		this.boardContainer.appendChild(floatingText);

		// GSAP/CSS animate up and fade out
		setTimeout(() => {
			floatingText.style.transform = 'translate(-50%, -150%) scale(1.1)';
			floatingText.style.opacity = '0';
		}, 20);

		setTimeout(() => {
			floatingText.remove();
		}, 1000);
	}
};
