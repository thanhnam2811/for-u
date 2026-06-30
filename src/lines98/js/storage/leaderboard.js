import { db } from '../../../shared/firebase.js';
import {
	collection,
	query,
	orderBy,
	limit,
	getDocs,
	addDoc,
	serverTimestamp,
	where,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const COLLECTION = 'lines98_scores';

/**
 * Submit a score to the Firestore leaderboard.
 * Includes replay data for server-side verification.
 *
 * @param {object} params
 * @param {string} params.uid - Firebase user ID
 * @param {string} params.displayName
 * @param {string} params.photoURL
 * @param {number} params.score
 * @param {number} params.turns
 * @param {number} params.ballsCleared
 * @param {number} params.longestLine
 * @param {string} [params.replaySeed] - Initial seed for replay verification
 * @param {string} [params.replayCode] - Base64 replay code for verification
 * @returns {Promise<boolean>}
 */
export async function submitScore({ uid, displayName, photoURL, score, turns, ballsCleared, longestLine, replaySeed, replayCode }) {
	if (!uid || score <= 0) return false;

	try {
		// Check if existing score is higher (keep best)
		const q = query(collection(db, COLLECTION), where('uid', '==', uid), limit(1));
		const existing = await getDocs(q);

		if (!existing.empty) {
			const existingData = existing.docs[0].data();
			if (existingData.score >= score) {
				// Existing score is equal or better — skip
				return false;
			}
			// Delete old doc so we can write the new higher score
			const oldRef = existing.docs[0].ref;
			const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
			await deleteDoc(oldRef);
		}

		await addDoc(collection(db, COLLECTION), {
			uid,
			displayName: displayName || 'Anonymous',
			photoURL: photoURL || '',
			score,
			turns,
			ballsCleared,
			longestLine,
			replaySeed: replaySeed || '',
			replayCode: replayCode || '',
			region: 'global',
			timestamp: serverTimestamp(),
		});

		return true;
	} catch (err) {
		console.error('Leaderboard submit error:', err);
		return false;
	}
}

/**
 * Fetch top N leaderboard entries.
 * @param {number} n - Number of entries (default 10)
 * @returns {Promise<Array>}
 */
export async function fetchLeaderboard(n = 10) {
	try {
		const q = query(collection(db, COLLECTION), orderBy('score', 'desc'), limit(n));
		const snapshot = await getDocs(q);

		const entries = [];
		snapshot.forEach((doc) => {
			const data = doc.data();
			entries.push({
				id: doc.id,
				uid: data.uid,
				displayName: data.displayName || 'Anonymous',
				photoURL: data.photoURL || '',
				score: data.score || 0,
				turns: data.turns || 0,
				ballsCleared: data.ballsCleared || 0,
				longestLine: data.longestLine || 0,
				timestamp: data.timestamp?.toMillis() || 0,
			});
		});

		return entries;
	} catch (err) {
		console.error('Leaderboard fetch error:', err);
		return [];
	}
}

/**
 * Fetch the current user's rank.
 * @param {number} userScore
 * @returns {Promise<number>} 1-based rank, or 0 if not found
 */
export async function fetchMyRank(userScore) {
	if (!userScore || userScore <= 0) return 0;

	try {
		const q = query(collection(db, COLLECTION), orderBy('score', 'desc'));
		const snapshot = await getDocs(q);

		let rank = 1;
		for (const doc of snapshot.docs) {
			const data = doc.data();
			if (data.score <= userScore) {
				return rank;
			}
			rank++;
		}
		return snapshot.size + 1;
	} catch (err) {
		console.error('Rank fetch error:', err);
		return 0;
	}
}
