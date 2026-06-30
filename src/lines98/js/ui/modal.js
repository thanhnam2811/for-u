import { state, restoreSnapshot, cloneSnapshot } from '../core/state.js';
import { THEMES, LS_THEME, LS_CHECKPOINT } from '../core/constants.js';
import { spriteCache } from '../render/spritecache.js';

/**
 * Modal manager: theme switcher and generic overlay helpers.
 */
export const modal = {
	/** Currently open modal element id (or null) */
	activeModal: null,

	initialize() {
		this._wirePaletteToggle();
		this._wirePaletteClose();
		this._wireCheckpointToggle();
		this._wireCheckpointClose();
		this._wireCheckpointSlots();
		this._wireChallengeToggle();
		this._wireChallengeClose();
		this._populatePaletteOptions();
		this._applySavedTheme();
	},

	// ── Theme Switcher ──

	_applySavedTheme() {
		const saved = localStorage.getItem(LS_THEME);
		if (saved && THEMES[saved]) {
			state.theme = saved;
		}
	},

	_wirePaletteToggle() {
		const btn = document.getElementById('palette-toggle');
		if (!btn) return;
		btn.addEventListener('click', () => this._openModal('palette-modal'));
	},

	_wirePaletteClose() {
		const closeBtn = document.getElementById('close-palette-btn');
		if (!closeBtn) return;
		closeBtn.addEventListener('click', () => this._closeModal());
	},

	// ── Checkpoint Modal ──

	_wireCheckpointToggle() {
		const btn = document.getElementById('checkpoint-toggle');
		if (!btn) return;
		btn.addEventListener('click', () => this._openModal('checkpoint-modal'));
	},

	_wireCheckpointClose() {
		const closeBtn = document.getElementById('close-checkpoint-btn');
		if (!closeBtn) return;
		closeBtn.addEventListener('click', () => this._closeModal());
	},

	_wireCheckpointSlots() {
		document.querySelectorAll('.cp-save').forEach(btn => {
			btn.addEventListener('click', () => {
				const slot = btn.dataset.slot;
				if (slot !== undefined) this._saveToSlot(parseInt(slot));
			});
		});
		document.querySelectorAll('.cp-load').forEach(btn => {
			btn.addEventListener('click', () => {
				const slot = btn.dataset.slot;
				if (slot !== undefined) this._loadFromSlot(parseInt(slot));
			});
		});
		// Init display for all slots
		[0, 1, 2].forEach(slot => this._updateSlotInfo(slot));
	},

	_saveToSlot(slot) {
		const raw = {
			...cloneSnapshot(),
			undoStack: state.undoStack.map(snap => ({ ...snap })),
			_savedAt: Date.now(),
			_savedScore: state.score,
			_savedTurn: state.turn,
		};
		localStorage.setItem(LS_CHECKPOINT + slot, JSON.stringify(raw));
		this._updateSlotInfo(slot);
	},

	async _loadFromSlot(slot) {
		const raw = localStorage.getItem(LS_CHECKPOINT + slot);
		if (!raw) return;
		try {
			const data = JSON.parse(raw);
			restoreSnapshot(data);
			if (data.undoStack) {
				state.undoStack = data.undoStack.map(snap => ({ ...snap }));
			}
			// Update HUD after restore
			const { hud } = await import('../ui/hud.js');
			if (hud) hud.update();

			this._closeModal();
		} catch (err) {
			console.error('Checkpoint load error:', err);
		}
	},

	async _updateSlotInfo(slot) {
		const infoEl = document.querySelector(`.cp-info[data-slot="${slot}"]`);
		const loadBtn = document.querySelector(`.cp-load[data-slot="${slot}"]`);
		if (!infoEl) return;

		const raw = localStorage.getItem(LS_CHECKPOINT + slot);

		if (raw) {
			try {
				const data = JSON.parse(raw);
				const time = data._savedAt
					? new Date(data._savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
					: '';
				infoEl.textContent = `🎯 ${data._savedScore || 0} · 🎮 ${data._savedTurn || 0} · ${time}`;
				infoEl.style.color = '';
				if (loadBtn) loadBtn.disabled = false;
			} catch {
				infoEl.textContent = '❌ Hỏng';
				if (loadBtn) loadBtn.disabled = true;
			}
		} else {
			infoEl.textContent = 'Trống';
			infoEl.style.color = '';
			if (loadBtn) loadBtn.disabled = true;
		}
	},

	// ── Challenge Modal ──

	_wireChallengeToggle() {
		const btn = document.getElementById('challenge-btn');
		if (!btn) return;
		btn.addEventListener('click', () => this._openModal('challenge-modal'));
	},

	_wireChallengeClose() {
		const closeBtn = document.getElementById('close-challenge-btn');
		if (!closeBtn) return;
		closeBtn.addEventListener('click', () => this._closeModal());
	},

	_populatePaletteOptions() {
		const container = document.getElementById('palette-options-container');
		if (!container) return;

		container.innerHTML = '';

		for (const [key, theme] of Object.entries(THEMES)) {
			const card = document.createElement('button');
			card.className =
				'w-full flex flex-col p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 bg-white/30 dark:bg-slate-900/20 hover:bg-white/60 dark:hover:bg-slate-900/40 hover:border-brand-pink dark:hover:border-brand-purple transition-all cursor-pointer';
			card.dataset.theme = key;

			// Name row (label + checkmark)
			const header = document.createElement('div');
			header.className = 'flex items-center justify-between mb-2';

			const nameSpan = document.createElement('span');
			nameSpan.className = 'font-display font-bold text-sm text-slate-800 dark:text-slate-200';
			nameSpan.textContent = theme.name;

			const check = document.createElement('span');
			check.className =
				'material-icons-round text-brand-pink dark:text-brand-purple text-lg transition-all duration-300';
			check.textContent = key === state.theme ? 'check_circle' : 'radio_button_unchecked';

			header.appendChild(nameSpan);
			header.appendChild(check);

			// Ball row (7 balls using theme's own colors)
			const swatches = document.createElement('div');
			swatches.className = 'flex gap-1.5';

			theme.balls.forEach(c => {
				const canvas = document.createElement('canvas');
				canvas.className = 'rounded-full border border-white/20 dark:border-slate-700/20';
				canvas.width = 18;
				canvas.height = 18;
				const ctx = canvas.getContext('2d');
				const r = 9;
				// Quick 3D ball render using theme colors (not spriteCache)
				const grad = ctx.createRadialGradient(r * 0.65, r * 0.55, 1, r, r, r);
				grad.addColorStop(0, '#FFFFFF');
				grad.addColorStop(0.15, c.light);
				grad.addColorStop(0.5, c.main);
				grad.addColorStop(1, c.dark);
				ctx.beginPath();
				ctx.arc(r, r, r - 1, 0, Math.PI * 2);
				ctx.fillStyle = grad;
				ctx.fill();
				// Highlight
				ctx.beginPath();
				ctx.arc(r * 0.7, r * 0.52, r * 0.22, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(255,255,255,0.4)';
				ctx.fill();
				swatches.appendChild(canvas);
			});

			card.appendChild(header);
			card.appendChild(swatches);

			card.addEventListener('click', () => this._selectTheme(key));
			container.appendChild(card);
		}
	},

	_selectTheme(themeKey) {
		if (!THEMES[themeKey] || themeKey === state.theme) return;

		// Update state
		state.theme = themeKey;

		// Persist
		localStorage.setItem(LS_THEME, themeKey);

		// Regenerate sprites with new color palette
		spriteCache.initialize(themeKey);

		// Update check icons in the palette list
		const container = document.getElementById('palette-options-container');
		if (container) {
			const cards = container.querySelectorAll('[data-theme]');
			cards.forEach((card) => {
				const check = card.querySelector('.material-icons-round');
				if (check) {
					check.textContent =
						card.dataset.theme === themeKey ? 'check_circle' : 'radio_button_unchecked';
				}
			});
		}

		// Close modal
		this._closeModal();
	},

	// ── Generic Modal Helpers ──

	_openModal(id) {
		const el = document.getElementById(id);
		if (!el) return;
		// Close any currently open modal first
		if (this.activeModal) this._closeModal();
		this.activeModal = id;
		el.classList.remove('pointer-events-none', 'opacity-0', 'invisible');
		el.classList.add('pointer-events-auto');
		// Trigger scale-in transition
		const inner = el.querySelector('div');
		if (inner) {
			inner.classList.remove('scale-95');
			inner.classList.add('scale-100');
		}
	},

	_closeModal() {
		if (!this.activeModal) return;
		const el = document.getElementById(this.activeModal);
		if (el) {
			el.classList.add('pointer-events-none', 'opacity-0', 'invisible');
			el.classList.remove('pointer-events-auto');
			const inner = el.querySelector('div');
			if (inner) {
				inner.classList.add('scale-95');
				inner.classList.remove('scale-100');
			}
		}
		this.activeModal = null;
	},

	/**
	 * Open any modal by id (public API).
	 */
	open(id) {
		this._openModal(id);
	},

	/**
	 * Close any modal by id (public API).
	 */
	close(id) {
		if (id) {
			const el = document.getElementById(id);
			if (el) {
				el.classList.add('pointer-events-none', 'opacity-0', 'invisible');
				el.classList.remove('pointer-events-auto');
				const inner = el.querySelector('div');
				if (inner) {
					inner.classList.add('scale-95');
					inner.classList.remove('scale-100');
				}
			}
			if (this.activeModal === id) this.activeModal = null;
		} else {
			this._closeModal();
		}
	}
};
