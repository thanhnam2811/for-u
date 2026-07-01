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

// Robustly retrieve display name and photo URL from user profile and providerData
export function getUserProfile(user) {
  let displayName = user.displayName;
  let photoURL = user.photoURL;

  if (user.providerData && user.providerData.length > 0) {
    const googleProfile = user.providerData.find(p => p.providerId === 'google.com');
    if (googleProfile) {
      if (googleProfile.displayName) displayName = googleProfile.displayName;
      if (googleProfile.photoURL) photoURL = googleProfile.photoURL;
    } else {
      for (const profile of user.providerData) {
        if (!displayName && profile.displayName) displayName = profile.displayName;
        if (!photoURL && profile.photoURL) photoURL = profile.photoURL;
      }
    }
  }

  return {
    displayName: displayName || (user.isAnonymous ? "Người chơi ẩn danh" : "Google Player"),
    photoURL: photoURL || ""
  };
}

// ── Leaderboard ──
export function saveToLeaderboard() {
  if (state.score <= 0) return;
  const board = getLeaderboard();
  board.push({ score: state.score, date: Date.now(), moves: state.moves });
  board.sort((a, b) => b.score - a.score);
  if (board.length > 10) board.length = 10;
  try { localStorage.setItem(LS_LEADERBOARD, JSON.stringify(board)); } catch (_) {}

  // Sync high score to the cloud leaderboard if this run set a new record
  if (state.score >= state.highScore) {
    syncHighScoreToCloud();
  }
}

// Push the current high score to Firestore immediately (called the moment a new
// record happens during play, not just when the game ends) so the global
// leaderboard reflects it even if the player never hits "game over".
export function syncHighScoreToCloud() {
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, 'players', user.uid);
  const profile = getUserProfile(user);
  setDoc(userDocRef, {
    highScore: state.highScore,
    highScoreMoves: state.moves,
    updatedAt: Date.now(),
    displayName: profile.displayName,
    photoURL: profile.photoURL
  }, { merge: true }).catch(err => console.error("Firestore syncHighScoreToCloud error:", err));
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
// Helper for document selection to avoid circular dependency with render.js
const select = (s) => document.querySelector(s);

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

      // Check if we just logged in and if there is a conflict
      const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
      if (justLoggedIn) {
        sessionStorage.removeItem('just_logged_in');

        // Conflict check: both have active saves, or both have high scores and they are different
        const hasLocalActive = !!localSaveRaw;
        const hasCloudActive = !!cloudData.saveGame;
        const hasLocalHighScore = localHighScore > 0;
        const hasCloudHighScore = (cloudData.highScore || 0) > 0;

        if ((hasLocalActive && hasCloudActive) || (hasLocalHighScore && hasCloudHighScore && localHighScore !== cloudData.highScore)) {
          return new Promise((resolve) => {
            const modal = select('#sync-conflict-modal');
            if (!modal) {
              // Fallback to confirm if modal is not in DOM
              if (confirm("Phát hiện dữ liệu trên đám mây khác với máy này. Bạn muốn tải dữ liệu đám mây về? (Nhấn Cancel để đẩy dữ liệu máy này lên đám mây)")) {
                resolve(applyCloudData(cloudData));
              } else {
                resolve(uploadLocalData(userDocRef, localHighScore, localSaveRaw, localCheckpoints, user));
              }
              return;
            }

            // Populate info on modal cards
            let localInfo = `Kỷ lục: ${localHighScore}đ`;
            if (localSaveRaw) {
              try {
                const s = JSON.parse(localSaveRaw);
                localInfo += ` • Đang chơi: ${s.score || 0}đ`;
              } catch (_) {}
            }
            const localText = select('#conflict-local-info');
            if (localText) localText.textContent = localInfo;

            let cloudInfo = `Kỷ lục: ${cloudData.highScore || 0}đ`;
            if (cloudData.saveGame) {
              try {
                const s = JSON.parse(cloudData.saveGame);
                cloudInfo += ` • Đang chơi: ${s.score || 0}đ`;
              } catch (_) {}
            }
            const cloudText = select('#conflict-cloud-info');
            if (cloudText) cloudText.textContent = cloudInfo;

            // Show modal
            modal.classList.add('visible');

            const keepBtn = select('#keep-local-btn');
            const restoreBtn = select('#restore-cloud-btn');

            const handleKeepLocal = async () => {
              modal.classList.remove('visible');
              cleanup();
              const needsReload = await uploadLocalData(userDocRef, localHighScore, localSaveRaw, localCheckpoints, user);
              resolve(needsReload);
            };

            const handleRestoreCloud = async () => {
              modal.classList.remove('visible');
              cleanup();
              const needsReload = await applyCloudData(cloudData);
              resolve(needsReload);
            };

            if (keepBtn) keepBtn.addEventListener('click', handleKeepLocal);
            if (restoreBtn) restoreBtn.addEventListener('click', handleRestoreCloud);

            function cleanup() {
              if (keepBtn) keepBtn.removeEventListener('click', handleKeepLocal);
              if (restoreBtn) restoreBtn.removeEventListener('click', handleRestoreCloud);
            }
          });
        }
      }

      // Default: auto merge
      return autoMergeUserProgress(userDocRef, cloudData, localHighScore, localSaveRaw, localCheckpoints, user);
    } else {
      // Create new document for user from local data
      const profile = getUserProfile(user);
      const initialData = {
        highScore: localHighScore,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
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

// Overwrite cloud document with local device progress
async function uploadLocalData(userDocRef, localHighScore, localSaveRaw, localCheckpoints, user) {
  const profile = getUserProfile(user);
  const uploadData = {
    updatedAt: Date.now(),
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    checkpoints: localCheckpoints,
    highScore: localHighScore,
    saveGame: localSaveRaw || null
  };
  await setDoc(userDocRef, uploadData, { merge: true });
  return false; // No local reload needed since we kept local device progress
}

// Overwrite local storage progress with cloud document progress
async function applyCloudData(cloudData) {
  const cloudHighScore = cloudData.highScore || 0;
  localStorage.setItem(LS_HIGH, cloudHighScore);
  state.highScore = cloudHighScore;

  if (cloudData.saveGame) {
    localStorage.setItem(LS_SAVE, cloudData.saveGame);
  } else {
    localStorage.removeItem(LS_SAVE);
  }

  const cloudCheckpoints = cloudData.checkpoints || {};
  for (let i = 0; i < 3; i++) {
    const cp = cloudCheckpoints[i];
    if (cp) {
      localStorage.setItem(LS_CHECKPOINT + i, cp);
    } else {
      localStorage.removeItem(LS_CHECKPOINT + i);
    }
  }
  return true; // Reload is required to apply the newly loaded cloud progress
}

// Automatic merge logic (for already logged-in users on reload)
async function autoMergeUserProgress(userDocRef, cloudData, localHighScore, localSaveRaw, localCheckpoints, user) {
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
  const cloudSave = cloudData.saveGame || null;
  let cloudSaveTime = 0;
  if (cloudSave) {
    try { cloudSaveTime = JSON.parse(cloudSave).timestamp || 0; } catch (_) {}
  }
  let localSaveTime = 0;
  if (localSaveRaw) {
    try { localSaveTime = JSON.parse(localSaveRaw).timestamp || 0; } catch (_) {}
  }

  if (cloudSave) {
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
    const cloudCp = cloudCheckpoints[i] || null;
    const localCp = localCheckpoints[i] || null;

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

  const profile = getUserProfile(user);
  if (
    cloudData.displayName !== profile.displayName ||
    cloudData.photoURL !== profile.photoURL
  ) {
    needsUpload = true;
  }

  if (needsUpload) {
    const uploadData = {
      updatedAt: Date.now(),
      displayName: profile.displayName,
      photoURL: profile.photoURL,
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
}
