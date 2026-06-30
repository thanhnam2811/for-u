/**
 * Replay Share utilities.
 * Wraps exportReplay/importReplay with clipboard and formatting helpers.
 */
import { exportReplay, importReplay } from '../core/replay.js';
import { simulateGame } from '../core/simulator.js';
import { state } from '../core/state.js';

/**
 * Copy the current game replay code to clipboard.
 * Includes seed and base64-encoded event history.
 * @returns {Promise<boolean>}
 */
export async function shareReplay() {
	const code = exportReplay();
	const shareText = `🎱 Lines 98 Replay\nSeed: ${state.initialSeed}\nCode: ${code}\n\nPaste this code into Lines 98 to replay the game!`;

	try {
		await navigator.clipboard.writeText(shareText);
		return true;
	} catch (err) {
		console.error('Clipboard write failed:', err);
		// Fallback: try older execCommand
		try {
			const textarea = document.createElement('textarea');
			textarea.value = shareText;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			return true;
		} catch (err2) {
			console.error('Fallback clipboard failed:', err2);
			return false;
		}
	}
}

/**
 * Verify a replay by running it through the headless simulator.
 *
 * @param {Array} events - Event history array
 * @param {number} initialSeed - The game's initial seed
 * @param {number} claimedScore - The score to verify against
 * @returns {{ valid: boolean, computedScore: number, boardHash: string, errors: string[], reason?: string }}
 */
export function verifyReplay(events, initialSeed, claimedScore) {
	if (!Array.isArray(events) || events.length === 0) {
		return { valid: false, computedScore: 0, boardHash: '', errors: ['Empty replay'], reason: 'Empty replay' };
	}

	const hasStart = events.some(e => e.type === 'START');
	if (!hasStart) {
		return { valid: false, computedScore: 0, boardHash: '', errors: ['Missing START event'], reason: 'Missing START event' };
	}

	const result = simulateGame(initialSeed || 0, events);

	const scoreMatch = Math.abs(result.score - (claimedScore || 0)) <= 1;
	const reason = !scoreMatch
		? `Score mismatch: simulated ${result.score} vs claimed ${claimedScore}`
		: result.errors.length > 0
			? `Simulation errors: ${result.errors.join('; ')}`
			: undefined;

	return {
		valid: result.valid && scoreMatch,
		computedScore: result.score,
		boardHash: result.boardHash,
		errors: result.errors,
		reason,
	};
}
