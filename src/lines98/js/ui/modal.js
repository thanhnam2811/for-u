import { state } from '../core/state.js';
import { THEMES, LS_THEME } from '../core/constants.js';
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

	_populatePaletteOptions() {
		const container = document.getElementById('palette-options-container');
		if (!container) return;

		container.innerHTML = '';

		for (const [key, theme] of Object.entries(THEMES)) {
			const card = document.createElement('button');
			card.className =
				'w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 bg-white/30 dark:bg-slate-900/20 hover:bg-white/60 dark:hover:bg-slate-900/40 hover:border-brand-pink dark:hover:border-brand-purple transition-all cursor-pointer text-left';
			card.dataset.theme = key;

			// Color swatches row
			const swatches = document.createElement('div');
			swatches.className = 'flex gap-1 flex-shrink-0';
			for (const ball of theme.balls) {
				const dot = document.createElement('span');
				dot.className = 'w-4 h-4 rounded-full border border-white/30 dark:border-slate-700/30';
				dot.style.background =
					`radial-gradient(circle at 35% 30%, ${ball.light}, ${ball.main} 60%, ${ball.dark})`;
				swatches.appendChild(dot);
			}

			// Label + checkmark
			const label = document.createElement('div');
			label.className = 'flex-1 flex items-center justify-between';

			const nameSpan = document.createElement('span');
			nameSpan.className = 'font-display font-bold text-sm text-slate-800 dark:text-slate-200';
			nameSpan.textContent = theme.name;

			const check = document.createElement('span');
			check.className =
				'material-icons-round text-brand-pink dark:text-brand-purple text-lg transition-all duration-300';
			check.textContent = key === state.theme ? 'check_circle' : 'radio_button_unchecked';

			label.appendChild(nameSpan);
			label.appendChild(check);
			card.appendChild(swatches);
			card.appendChild(label);

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
