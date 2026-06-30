import { SIZE, NUM_COLORS, MIN_LINE } from './constants.js';

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

/**
 * Detect completed lines passing through a cell.
 * @returns {Array<[number, number]>} list of [row, col] to clear
 */
function findLinesAt(board, row, col) {
	const color = board[row][col];
	if (!color) return [];
	const found = new Set();
	for (const [dr, dc] of DIRS) {
		const cells = [[row, col]];
		let r = row + dr, c = col + dc;
		while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === color) {
			cells.push([r, c]);
			r += dr; c += dc;
		}
		r = row - dr; c = col - dc;
		while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === color) {
			cells.unshift([r, c]);
			r -= dr; c -= dc;
		}
		if (cells.length >= MIN_LINE) {
			cells.forEach(([rr, cc]) => found.add(`${rr},${cc}`));
		}
	}
	return [...found].map(k => k.split(',').map(Number));
}

/**
 * Headless replay simulator.
 *
 * Accepts initialSeed + event history (from exportReplay / importReplay),
 * replays them deterministically, and returns the final state.
 *
 * @param {number} initialSeed
 * @param {Array} events — Array of { type, from, to, balls, cells, scoreDelta }
 * @returns {{ score, board, boardHash, errors, valid, eventCount }}
 */
export function simulateGame(initialSeed, events) {
	const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
	let score = 0;
	const errors = [];

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];

		if (ev.type === 'START') continue;

		if (ev.type === 'MOVE') {
			const [fr, fc] = ev.from;
			const [tr, tc] = ev.to;
			if (!board[fr] || board[fr][fc] === 0) {
				errors.push(`Event ${i}: MOVE source (${fr},${fc}) empty`);
				continue;
			}
			if (board[tr][tc] !== 0) {
				errors.push(`Event ${i}: MOVE dest (${tr},${tc}) occupied`);
				continue;
			}
			board[tr][tc] = board[fr][fc];
			board[fr][fc] = 0;

			// Validate that clearing lines at dest matches the recorded CLEAR
			const lineCells = findLinesAt(board, tr, tc);
			if (lineCells.length >= MIN_LINE) {
				// Line detected — the next event should be a CLEAR for these cells
				const nextEv = events[i + 1];
				if (!nextEv || nextEv.type !== 'CLEAR') {
					errors.push(`Event ${i}: MOVE created a line but next event is not CLEAR`);
				}
			}
		}

		else if (ev.type === 'SPAWN') {
			for (const ball of ev.balls) {
				const [r, c, color] = Array.isArray(ball) ? ball : [ball.row, ball.col, ball.color];
				if (!board[r]) {
					errors.push(`Event ${i}: SPAWN invalid position (${r},${c})`);
					continue;
				}
				if (board[r][c] !== 0) {
					errors.push(`Event ${i}: SPAWN position (${r},${c}) occupied`);
					continue;
				}
				board[r][c] = color;
			}
		}

		else if (ev.type === 'CLEAR') {
			const cellCount = ev.cells ? ev.cells.length : 0;
			for (const cell of ev.cells) {
				const [r, c] = Array.isArray(cell) ? cell : [cell.row, cell.col];
				if (!board[r]) {
					errors.push(`Event ${i}: CLEAR invalid position (${r},${c})`);
					continue;
				}
				if (board[r][c] === 0) {
					errors.push(`Event ${i}: CLEAR position (${r},${c}) already empty`);
					continue;
				}
				board[r][c] = 0;
			}
			if (ev.scoreDelta !== undefined) {
				const expected = cellCount * (cellCount - 3);
				if (ev.scoreDelta !== expected) {
					errors.push(`Event ${i}: CLEAR scoreDelta ${ev.scoreDelta} != expected ${expected}`);
				}
				score += ev.scoreDelta;
			}
		}

		else if (ev.type === 'SCORE') {
			if (ev.delta !== undefined) score += ev.delta;
		}
	}

	// Compute board fingerprint
	const boardStr = board.map(r => r.join(',')).join('|');
	let hash = 0;
	for (let i = 0; i < boardStr.length; i++) {
		hash = ((hash << 5) - hash) + boardStr.charCodeAt(i);
		hash |= 0;
	}

	return {
		score,
		board,
		boardHash: Math.abs(hash).toString(16).padStart(8, '0'),
		errors,
		valid: errors.length === 0,
		eventCount: events.length,
	};
}
