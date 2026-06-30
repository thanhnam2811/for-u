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
 * Generates a deterministic seed from today's date,
 * tracks 3 daily goals, and updates progress automatically.
 */
export const challenge = {
	barEl: null,
	goalEls: [],

	initialize() {
		this.barEl = document.getElementById('challenge-bar');
		if (!this.barEl) return;

		// Build goal rows
		const listEl = this.barEl.querySelector('.challenge-goals');
		if (!listEl) return;

		listEl.innerHTML = '';
		this.goalEls = [];

		state.challenge.goals.forEach((goal, i) => {
			const row = document.createElement('div');
			row.className = 'flex items-center gap-2 text-xs';

			const icon = document.createElement('span');
			icon.className = 'material-icons-round text-sm flex-shrink-0';
			icon.textContent = goal.done ? 'check_circle' : 'radio_button_unchecked';
			icon.style.color = goal.done ? '#22C55E' : '#94A3B8';

			const label = document.createElement('span');
			label.className = 'flex-1 text-slate-600 dark:text-slate-400 font-medium truncate';
			label.textContent = goal.label;

			const prog = document.createElement('span');
			prog.className = 'font-bold text-slate-700 dark:text-slate-300 flex-shrink-0';
			prog.textContent = `${Math.min(goal.progress, goal.target)}/${goal.target}`;

			row.appendChild(icon);
			row.appendChild(label);
			row.appendChild(prog);
			listEl.appendChild(row);
			this.goalEls.push({ icon, label, prog, row });
		});

		this._updateVisibility();
	},

	/**
	 * Call this after every move/clear to sync progress.
	 */
	update() {
		const goals = state.challenge.goals;

		// Goal 0: moves
		goals[0].progress = state.turn;

		// Goal 1: score
		goals[1].progress = state.score;

		// Goal 2: balls cleared
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

			// Update display
			if (this.goalEls[i]) {
				this.goalEls[i].icon.textContent = goal.done ? 'check_circle' : 'radio_button_unchecked';
				this.goalEls[i].icon.style.color = goal.done ? '#22C55E' : '#94A3B8';
				this.goalEls[i].prog.textContent = `${Math.min(goal.progress, goal.target)}/${goal.target}`;
			}
		});

		state.challenge.completed = allDone;

		this._updateVisibility();
	},

	_animateGoalComplete(index) {
		const el = this.goalEls[index]?.row;
		if (!el) return;

		// Flash animation
		el.classList.add('animate-pulse', 'text-green-500');
		setTimeout(() => el.classList.remove('animate-pulse'), 1000);
	},

	_updateVisibility() {
		if (!this.barEl) return;
		// Only show if challenge is active or goals have progress
		const hasProgress = state.challenge.goals.some(g => g.progress > 0);
		this.barEl.classList.toggle('hidden', !hasProgress);
	},
};
