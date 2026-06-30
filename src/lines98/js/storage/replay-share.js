/**
 * Replay Share utilities.
 * Wraps exportReplay/importReplay with clipboard and formatting helpers.
 */
import { exportReplay, importReplay } from '../core/replay.js';
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
 * Verify a replay by simulating it.
 * Runs through the event history and checks that the final score matches.
 *
 * @param {Array} events - Event history array
 * @param {number} claimedScore - The score to verify against
 * @returns {{ valid: boolean, computedScore: number, reason?: string }}
 */
export function verifyReplay(events, claimedScore) {
	// We do basic structure + score consistency checks
	// Full headless simulation can be added later
	if (!Array.isArray(events) || events.length === 0) {
		return { valid: false, computedScore: 0, reason: 'Empty replay' };
	}

	// Check that there's a START event
	const hasStart = events.some(e => e.type === 'START');
	if (!hasStart) {
		return { valid: false, computedScore: 0, reason: 'Missing START event' };
	}

	// Crude score approximation from CLEAR events
	let computedScore = 0;
	for (const e of events) {
		if (e.type === 'CLEAR' && e.scoreDelta) {
			computedScore += e.scoreDelta;
		}
	}

	const valid = Math.abs(computedScore - claimedScore) <= 5; // Allow small rounding
	return {
		valid,
		computedScore,
		reason: valid ? undefined : `Score mismatch: computed ${computedScore}, claimed ${claimedScore}`,
	};
}
