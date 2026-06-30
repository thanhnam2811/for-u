import { state } from '../core/state.js';
import { SeededRNG } from '../core/rng.js';

/**
 * Deterministic seed from today's date string (YYYY-MM-DD).
 * Ensures all players get the same board on the same day.
 */
export function getDailySeed() {
	const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	let hash = 0;
	for (let i = 0; i < dateStr.length; i++) {
		hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
		hash |= 0; // Convert to 32bit int
	}
	return Math.abs(hash);
}

/**
 * Daily Challenge system.
 *
 * Renders goals inside a popup modal.
 * Toggle with challenge-btn in the controls bar.
 */
export const challenge = {
	goalEls: [],
	progressBar: null,
	badgeEl: null,

	initialize() {
		const listEl = document.querySelector('.challenge-goals');
		if (!listEl) return;

		this.progressBar = document.querySelector('.challenge-progress-bar');

		listEl.innerHTML = '';
		this.goalEls = [];

		state.challenge.goals.forEach((goal, i) => {
			const row = document.createElement('div');
			row.className = 'flex items-center gap-2 text-sm';

			const icon = document.createElement('span');
			icon.className = 'material-icons-round text-base flex-shrink-0';
			icon.textContent = goal.done ? 'check_circle' : 'radio_button_unchecked';
			icon.style.color = goal.done ? '#22C55E' : '#94A3B8';

			const label = document.createElement('span');
			label.className = 'flex-1 text-slate-700 dark:text-slate-300 font-medium';
			label.textContent = goal.label;

			const prog = document.createElement('span');
			prog.className = 'font-bold text-slate-800 dark:text-slate-200 flex-shrink-0';
			prog.textContent = `${Math.min(goal.progress, goal.target)}/${goal.target}`;

			row.appendChild(icon);
			row.appendChild(label);
			row.appendChild(prog);
			listEl.appendChild(row);
			this.goalEls.push({ icon, label, prog, row });
		});

		this._updateBadge();
		this._updateProgressBar();
	},

	/**
	 * Call this after every move/clear to sync progress.
	 */
	update() {
		const goals = state.challenge.goals;

		goals[0].progress = state.turn;
		goals[1].progress = state.score;
		goals[2].progress = state.ballsCleared;

		let allDone = true;
		goals.forEach((goal, i) => {
			if (goal.progress >= goal.target) {
				if (!goal.done) {
					goal.done = true;
					this._animateGoalComplete(i);
				}
			} else {
				allDone = false;
			}

			if (this.goalEls[i]) {
				this.goalEls[i].icon.textContent = goal.done ? 'check_circle' : 'radio_button_unchecked';
				this.goalEls[i].icon.style.color = goal.done ? '#22C55E' : '#94A3B8';
				this.goalEls[i].prog.textContent = `${Math.min(goal.progress, goal.target)}/${goal.target}`;
			}
		});

		state.challenge.completed = allDone;
		this._updateBadge();
		this._updateProgressBar();
	},

	_animateGoalComplete(index) {
		const el = this.goalEls[index]?.row;
		if (!el) return;
		el.classList.add('animate-pulse', 'text-green-500');
		setTimeout(() => el.classList.remove('animate-pulse'), 1000);
	},

	_updateBadge() {
		if (!this.badgeEl) {
			this.badgeEl = document.createElement('span');
			this.badgeEl.className =
				'absolute -top-1.5 -right-1.5 bg-gradient-to-br from-amber-400 to-rose-500 text-white text-[9px] font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-[0_2px_6px_rgba(245,158,11,0.4)]';
			const btn = document.getElementById('challenge-btn');
			if (btn) {
				btn.style.position = 'relative';
				btn.appendChild(this.badgeEl);
			}
		}
		const done = state.challenge.goals.filter(g => g.done).length;
		this.badgeEl.textContent = `${done}/3`;
	},

	_updateProgressBar() {
		if (!this.progressBar) return;
		const done = state.challenge.goals.filter(g => g.done).length;
		this.progressBar.style.width = `${(done / 3) * 100}%`;
	}
};
