// ── Lines 97 — Save / Checkpoint / Leaderboard ──
import { LS_SAVE, LS_LEADERBOARD, LS_CHECKPOINT, LS_HIGH } from './constants.js';
import { state, cloneSnapshot, restoreSnapshot } from './state.js';
import { auth, db } from '../../shared/firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── Auto-save (current game) ──
export function autoSave() {
  const data = {
    ...cloneSnapshot(),
    highScore: state.highScore,
    palette: state.palette,
    timestamp: Date.now(),
    undoStack: state.undoStack.map(s => ({
      board: s.board.map(r => [...r]),
      score: s.score,
      nextBalls: s.nextBalls.map(b => ({ ...b })),
      moves: s.moves,
      ballsCleared: s.ballsCleared,
      longestLine: s.longestLine,
      elapsedTime: s.elapsedTime,
    })),
  };
  const stringified = JSON.stringify(data);
  try { localStorage.setItem(LS_SAVE, stringified); } catch (_) {}

  // Sync to Firestore if authenticated (Upload as string to avoid Firestore nested array error)
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, 'players', user.uid);
    setDoc(userDocRef, {
      saveGame: stringified,
      updatedAt: Date.now()
    }, { merge: true }).catch(err => console.error("Firestore autoSave error:", err));
  }
}

export function loadSavedGame() {
  const raw = localStorage.getItem(LS_SAVE);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data.board || data.board.length === 0) return false;
    restoreSnapshot(data);
    if (data.highScore !== undefined) state.highScore = data.highScore;
    if (data.palette) state.palette = data.palette;
    if (data.undoStack) {
      state.undoStack = data.undoStack.map(s => ({
        board: s.board.map(r => [...r]),
        score: s.score,
        nextBalls: s.nextBalls.map(b => ({ ...b })),
        moves: s.moves,
        ballsCleared: s.ballsCleared,
        longestLine: s.longestLine,
        elapsedTime: s.elapsedTime,
      }));
    }
    return true;
  } catch (_) { return false; }
}

export function clearSave() {
  localStorage.removeItem(LS_SAVE);
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, 'players', user.uid);
    setDoc(userDocRef, {
      saveGame: null,
      updatedAt: Date.now()
    }, { merge: true }).catch(err => console.error("Firestore clearSave error:", err));
  }
}

// ── Checkpoints (3 slots) ──
export function saveCheckpoint(slot) {
  const data = {
    ...cloneSnapshot(),
    timestamp: Date.now(),
  };
  const stringified = JSON.stringify(data);
  try { localStorage.setItem(LS_CHECKPOINT + slot, stringified); } catch (_) {}

  // Sync to Firestore if authenticated (Upload as string to avoid Firestore nested array error)
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, 'players', user.uid);
    setDoc(userDocRef, {
      checkpoints: {
        [slot]: stringified
      },
      updatedAt: Date.now()
    }, { merge: true }).catch(err => console.error("Firestore saveCheckpoint error:", err));
  }
}

export function loadCheckpoint(slot) {
  const raw = localStorage.getItem(LS_CHECKPOINT + slot);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    restoreSnapshot(data);
    state.undoStack = [];
    return true;
  } catch (_) { return false; }
}

export function getCheckpointInfo(slot) {
  const raw = localStorage.getItem(LS_CHECKPOINT + slot);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

export function deleteCheckpoint(slot) {
  localStorage.removeItem(LS_CHECKPOINT + slot);
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, 'players', user.uid);
    setDoc(userDocRef, {
      checkpoints: {
        [slot]: null
      },
      updatedAt: Date.now()
    }, { merge: true }).catch(err => console.error("Firestore deleteCheckpoint error:", err));
  }
}

// ── Leaderboard ──
export function saveToLeaderboard() {
  if (state.score <= 0) return;
  const board = getLeaderboard();
  board.push({ score: state.score, date: Date.now(), moves: state.moves });
  board.sort((a, b) => b.score - a.score);
  if (board.length > 10) board.length = 10;
  try { localStorage.setItem(LS_LEADERBOARD, JSON.stringify(board)); } catch (_) {}

  // Sync to Firestore if authenticated
  const user = auth.currentUser;
  if (user) {
    if (state.score >= state.highScore) {
      const userDocRef = doc(db, 'players', user.uid);
      setDoc(userDocRef, {
        highScore: state.highScore,
        highScoreMoves: state.moves,
        updatedAt: Date.now(),
        displayName: user.displayName || (user.isAnonymous ? "Người chơi ẩn danh" : "Google Player"),
        photoURL: user.photoURL || ""
      }, { merge: true }).catch(err => console.error("Firestore saveToLeaderboard error:", err));
    }
  }
}

export function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_LEADERBOARD)) || []; }
  catch (_) { return []; }
}

// ── Firestore Global Leaderboard ──
export async function getGlobalLeaderboard() {
  try {
    const q = query(
      collection(db, "players"),
      orderBy("highScore", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      if (d.highScore && d.highScore > 0) {
        list.push({
          displayName: d.displayName || "Người chơi ẩn danh",
          photoURL: d.photoURL || "",
          score: d.highScore,
          date: d.updatedAt || Date.now(),
          moves: d.highScoreMoves || 0
        });
      }
    });
    return list;
  } catch (err) {
    console.error("Firestore getGlobalLeaderboard error:", err);
    return getLeaderboard(); // Fallback to local
  }
}

// ── Cloud Sync ──
export async function syncUserProgress(user) {
  if (!user) return false;
  const userDocRef = doc(db, 'players', user.uid);
  try {
    const docSnap = await getDoc(userDocRef);
    const localHighScore = parseInt(localStorage.getItem(LS_HIGH)) || 0;
    const localSaveRaw = localStorage.getItem(LS_SAVE);

    // Read local checkpoints as strings
    const localCheckpoints = {};
    for (let i = 0; i < 3; i++) {
      const raw = localStorage.getItem(LS_CHECKPOINT + i);
      if (raw) localCheckpoints[i] = raw;
    }

    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      let needsUpload = false;
      let needsLocalReload = false;

      // 1. High Score Sync
      const cloudHighScore = cloudData.highScore || 0;
      if (cloudHighScore > localHighScore) {
        localStorage.setItem(LS_HIGH, cloudHighScore);
        state.highScore = cloudHighScore;
        needsLocalReload = true;
      } else if (localHighScore > cloudHighScore) {
        needsUpload = true;
      }

      // 2. Save Game Sync
      const cloudSave = cloudData.saveGame || null; // JSON String
      if (cloudSave) {
        let cloudSaveTime = 0;
        try { cloudSaveTime = JSON.parse(cloudSave).timestamp || 0; } catch (_) {}

        let localSaveTime = 0;
        if (localSaveRaw) {
          try { localSaveTime = JSON.parse(localSaveRaw).timestamp || 0; } catch (_) {}
        }

        if (cloudSaveTime > localSaveTime) {
          localStorage.setItem(LS_SAVE, cloudSave);
          needsLocalReload = true;
        } else if (localSaveTime > cloudSaveTime) {
          needsUpload = true;
        }
      } else if (localSaveRaw) {
        needsUpload = true;
      }

      // 3. Checkpoints Sync
      const cloudCheckpoints = cloudData.checkpoints || {};
      const mergedCheckpoints = { ...cloudCheckpoints };

      for (let i = 0; i < 3; i++) {
        const cloudCp = cloudCheckpoints[i] || null; // JSON String
        const localCp = localCheckpoints[i] || null; // JSON String
        
        let cloudCpTime = 0;
        if (cloudCp) {
          try { cloudCpTime = JSON.parse(cloudCp).timestamp || 0; } catch (_) {}
        }
        
        let localCpTime = 0;
        if (localCp) {
          try { localCpTime = JSON.parse(localCp).timestamp || 0; } catch (_) {}
        }

        if (cloudCp) {
          if (cloudCpTime > localCpTime) {
            localStorage.setItem(LS_CHECKPOINT + i, cloudCp);
            needsLocalReload = true;
          } else if (localCpTime > cloudCpTime) {
            needsUpload = true;
            mergedCheckpoints[i] = localCp;
          }
        } else if (localCp) {
          needsUpload = true;
          mergedCheckpoints[i] = localCp;
        }
      }

      // Update user profile info on Firestore if it has changed or is empty
      if (
        cloudData.displayName !== user.displayName ||
        cloudData.photoURL !== user.photoURL
      ) {
        needsUpload = true;
      }

      if (needsUpload) {
        const uploadData = {
          updatedAt: Date.now(),
          displayName: user.displayName || (user.isAnonymous ? "Người chơi ẩn danh" : "Google Player"),
          photoURL: user.photoURL || "",
          checkpoints: mergedCheckpoints
        };
        if (localHighScore > cloudHighScore) {
          uploadData.highScore = localHighScore;
        }
        if (localSaveRaw) {
          uploadData.saveGame = localSaveRaw;
        }
        await updateDoc(userDocRef, uploadData);
      }

      return needsLocalReload;
    } else {
      // Create new document for user from local data
      const initialData = {
        highScore: localHighScore,
        displayName: user.displayName || (user.isAnonymous ? "Người chơi ẩn danh" : "Google Player"),
        photoURL: user.photoURL || "",
        updatedAt: Date.now(),
        checkpoints: localCheckpoints
      };
      if (localSaveRaw) {
        initialData.saveGame = localSaveRaw;
      }
      await setDoc(userDocRef, initialData);
      return false;
    }
  } catch (err) {
    console.error("Sync error:", err);
    return false;
  }
}
