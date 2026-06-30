import { state, resetState } from './state.js';

let eventHistory = [];

export function clearHistory() {
	eventHistory = [];
}

export function logEvent(event) {
	eventHistory.push({
		...event,
		timestamp: Date.now()
	});
}

export function getHistory() {
	return eventHistory;
}

export function setHistory(history) {
	eventHistory = history;
}

/**
 * Serializes the game's initial seed and event history into a compact Base64 code.
 * @returns {string} Base64 encoded replay code.
 */
export function exportReplay() {
	const replayObj = {
		initialSeed: state.initialSeed,
		history: eventHistory.map(e => {
			const compact = { t: e.type };
			if (e.type === 'MOVE') {
				compact.f = e.from;
				compact.o = e.to;
			} else if (e.type === 'SPAWN') {
				compact.b = e.balls; // [[r, c, color], ...]
			} else if (e.type === 'CLEAR') {
				compact.c = e.cells; // [[r, c], ...]
				compact.d = e.scoreDelta;
			} else if (e.type === 'SCORE') {
				compact.s = e.delta;
			}
			return compact;
		})
	};

	const jsonStr = JSON.stringify(replayObj);
	// Compress to base64 safely
	return btoa(unescape(encodeURIComponent(jsonStr)));
}

/**
 * Deserializes and imports a replay code.
 * @param {string} base64Str 
 * @returns {{initialSeed: number, history: Array}|null}
 */
export function importReplay(base64Str) {
	try {
		const jsonStr = decodeURIComponent(escape(atob(base64Str)));
		const raw = JSON.parse(jsonStr);

		if (typeof raw.initialSeed !== 'number' || !Array.isArray(raw.history)) {
			return null;
		}

		const history = raw.history.map(e => {
			const event = {};
			if (e.t === 'MOVE') {
				event.type = 'MOVE';
				event.from = e.f;
				event.to = e.o;
			} else if (e.t === 'SPAWN') {
				event.type = 'SPAWN';
				event.balls = e.b;
			} else if (e.t === 'CLEAR') {
				event.type = 'CLEAR';
				event.cells = e.c;
				event.scoreDelta = e.d;
			} else if (e.t === 'SCORE') {
				event.type = 'SCORE';
				event.delta = e.s;
			}
			return event;
		});

		return {
			initialSeed: raw.initialSeed,
			history
		};
	} catch (err) {
		console.error("Replay import error:", err);
		return null;
	}
}

/**
 * Evaluates the heatmap grid of cell usage.
 * Indicates how long a ball stays in each cell or how many times it was moved.
 * @returns {Array<Array<number>>} 9x9 heatmap array where higher value means more usage.
 */
export function generateHeatmap() {
	const heatmap = Array.from({ length: 9 }, () => Array(9).fill(0));

	for (const e of eventHistory) {
		if (e.type === 'MOVE') {
			const [fr, fc] = e.from;
			const [tr, tc] = e.to;
			heatmap[fr][fc] += 1;
			heatmap[tr][tc] += 1;
		} else if (e.type === 'SPAWN') {
			for (const [r, c] of e.balls) {
				heatmap[r][c] += 1;
			}
		} else if (e.type === 'CLEAR') {
			for (const [r, c] of e.cells) {
				heatmap[r][c] += 1.5; // clear locations are hot spots
			}
		}
		// SCORE events don't affect heatmap
	}

	return heatmap;
}
