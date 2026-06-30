import { db } from '../../../shared/firebase.js';
import {
	doc,
	setDoc,
	getDoc,
	deleteDoc,
	serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const COLLECTION = 'lines98_saves';

/**
 * Save game progress to Firestore for the current user.
 * @param {object} saveData - Game state snapshot + metadata
 * @returns {Promise<boolean>}
 */
export async function cloudSave(saveData) {
	if (!saveData.uid) return false;

	try {
		const ref = doc(db, COLLECTION, saveData.uid);
		await setDoc(ref, {
			...saveData,
			updatedAt: serverTimestamp(),
		});
		return true;
	} catch (err) {
		console.error('Cloud save error:', err);
		return false;
	}
}

/**
 * Load game progress from Firestore.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function cloudLoad(uid) {
	if (!uid) return null;

	try {
		const ref = doc(db, COLLECTION, uid);
		const snap = await getDoc(ref);

		if (snap.exists()) {
			const data = snap.data();
			// Remove Firestore timestamps/metadata
			delete data.updatedAt;
			return data;
		}
		return null;
	} catch (err) {
		console.error('Cloud load error:', err);
		return null;
	}
}

/**
 * Delete cloud save (e.g., on sign out).
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function cloudDelete(uid) {
	if (!uid) return false;

	try {
		await deleteDoc(doc(db, COLLECTION, uid));
		return true;
	} catch (err) {
		console.error('Cloud delete error:', err);
		return false;
	}
}

/**
 * Compare local and cloud save data, return conflict info.
 * @param {object} localData
 * @param {object} cloudData
 * @returns {{ hasConflict: boolean, localScore: number, cloudScore: number }}
 */
export function detectConflict(localData, cloudData) {
	if (!cloudData) return { hasConflict: false, localScore: localData?.score || 0, cloudScore: 0 };

	const localScore = localData?.score || 0;
	const cloudScore = cloudData?.score || 0;

	return {
		hasConflict: localScore !== cloudScore,
		localScore,
		cloudScore,
	};
}
