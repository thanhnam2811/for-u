// ── Lines 97 — Main Entry Point ──
import { MAX_UNDO, MAX_HINT, LS_HIGH, LS_PALETTE, LS_SOUND, SPAWN_COUNT } from './constants.js';
import { state, cloneSnapshot, resetState } from './state.js';
import { Sound } from './sound.js';
import { getEmptyCells, findPath, checkLines, checkAllNewBalls, spawnBalls, generateNextBalls } from './logic.js';
import {
  $, $$, buildBoard, renderBoard, renderPreview, renderScore, renderStats, renderUndoHintUI,
  animateMove, animateSpawn, removeWithEffect, showGameOver, hideGameOver, showToast,
  delay, buildPalettePanel, applyPalette, getCell, showLeaderboard, hideLeaderboard,
  renderCheckpointSlots, drawPath, clearPath,
} from './render.js';
import {
  autoSave, loadSavedGame, clearSave, saveCheckpoint, loadCheckpoint, saveToLeaderboard, getLeaderboard,
  syncUserProgress, getGlobalLeaderboard
} from './save.js';
import { auth } from './firebase.js';
import {
  signInAnonymously,
  GoogleAuthProvider,
  signInWithRedirect,
  linkWithPopup,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { findBestHint, showHint, clearHint } from './hint.js';
import { Haptics } from './haptics.js';

// ── Init ──
function init() {
  loadSettings();
  Sound.init();
  buildBoard();
  buildPalettePanel();
  applyPalette(state.palette);
  setupEvents();

  if (!loadSavedGame()) {
    startNewGame();
  } else {
    // Resumed saved game
    renderBoard();
    renderPreview();
    renderScore();
    renderStats();
    renderUndoHintUI();
    renderCheckpointSlots();
    startTimer();
  }

  // Register Service Worker for offline play
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered!', reg))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }

  // Setup Google sign-in auth and sync
  setupFirebaseAuth();
}

function loadSettings() {
  state.highScore = parseInt(localStorage.getItem(LS_HIGH)) || 0;
  state.palette = localStorage.getItem(LS_PALETTE) || 'pastel';
  const sp = localStorage.getItem(LS_SOUND);
  Sound.enabled = sp === null ? true : sp === 'true';
  updateSoundUI();
}

// ── New Game ──
function startNewGame() {
  stopTimer();
  resetState();
  generateNextBalls();
  spawnBalls(5); // INITIAL_SPAWN
  generateNextBalls();
  clearSave();
  renderBoard();
  renderPreview();
  renderScore();
  renderStats();
  renderUndoHintUI();
  renderCheckpointSlots();
  hideGameOver();
  startTimer();
}

// ── Timer ──
function startTimer() {
  stopTimer();
  state.timerInterval = setInterval(() => {
    if (!document.hidden && !state.gameOver) {
      state.elapsedTime++;
      renderStats();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

// ── Undo ──
function saveSnapshot() {
  state.undoStack.push({
    board: state.board.map(r => [...r]),
    score: state.score,
    nextBalls: state.nextBalls.map(b => ({ ...b })),
    moves: state.moves,
    ballsCleared: state.ballsCleared,
    longestLine: state.longestLine,
    elapsedTime: state.elapsedTime,
  });
}

function undo() {
  if (!state.undoStack.length || state.animating || state.gameOver) return;
  const snap = state.undoStack.pop();
  state.board = snap.board.map(r => [...r]);
  state.score = snap.score;
  state.nextBalls = snap.nextBalls.map(b => ({ ...b }));
  
  // Randomize only next spawn positions to let player reroll positions upon undo
  const empties = getEmptyCells();
  for (const ball of state.nextBalls) {
    if (empties.length === 0) break;
    const idx = Math.floor(Math.random() * empties.length);
    const pos = empties.splice(idx, 1)[0];
    ball.row = pos.row;
    ball.col = pos.col;
  }

  state.moves = snap.moves;
  state.ballsCleared = snap.ballsCleared;
  state.longestLine = snap.longestLine;
  state.elapsedTime = snap.elapsedTime;
  state.selected = null;
  Sound.undo();
  renderBoard(); renderPreview(); renderScore(); renderStats(); renderUndoHintUI();
  autoSave();
}

// ── Movement Logic ──
async function executeMove(row, col) {
  const path = findPath(state.selected.row, state.selected.col, row, col);
  if (!path) return;

  // Save for undo
  saveSnapshot();
  state.animating = true;
  clearHint();
  clearPath();
  
  const fromR = state.selected.row, fromC = state.selected.col;
  const color = state.board[fromR][fromC];
  state.board[fromR][fromC] = 0;
  state.selected = null;
  state.moves++;
  renderBoard();

  await animateMove(path, color);
  state.board[row][col] = color;
  renderBoard();
  Sound.land();
  Haptics.light();

  // Check lines
  const removed = checkLines(row, col);
  if (removed.length > 0) {
    Haptics.success();
    await removeWithEffect(removed);
    state.animating = false;
  } else {
    // Spawn
    spawnBalls(SPAWN_COUNT);
    renderBoard(); Sound.spawn();
    await animateSpawn();
    const spawnRemoved = checkAllNewBalls(
      state.nextBalls.filter(b => state.board[b.row]?.[b.col])
    );
    if (spawnRemoved.length > 0) {
      Haptics.success();
      await removeWithEffect(spawnRemoved);
    }
    generateNextBalls();
    renderPreview();
    if (getEmptyCells().length === 0) {
      state.gameOver = true;
      state.animating = false;
      stopTimer();
      Sound.gameOver();
      Haptics.gameOver();
      saveToLeaderboard();
      clearSave();
      showGameOver();
      return;
    }
    state.animating = false;
  }
  renderStats(); renderUndoHintUI(); autoSave();
}

// ── Cell Click ──
async function onCellClick(row, col) {
  if (state.animating || state.gameOver) return;
  Sound.resume();
  const value = state.board[row][col];

  // Click ball
  if (value !== 0) {
    if (state.selected && state.selected.row === row && state.selected.col === col) {
      state.selected = null; Sound.deselect();
      Haptics.light();
      clearPath();
    } else {
      state.selected = { row, col }; Sound.select();
      Haptics.light();
      clearHint();
    }
    renderBoard(); return;
  }

  // Click empty — need selected
  if (!state.selected) return;
  const path = findPath(state.selected.row, state.selected.col, row, col);
  if (!path) {
    Sound.noPath();
    Haptics.error();
    const c = getCell(row, col);
    c.classList.add('no-path');
    setTimeout(() => c.classList.remove('no-path'), 400);
    return;
  }

  await executeMove(row, col);
}

// ── Hint ──
function useHint() {
  if (state.hintLeft <= 0 || state.animating || state.gameOver) return;
  Sound.resume();
  const hint = findBestHint();
  if (!hint) { showToast('Không tìm thấy gợi ý 🤷'); return; }
  state.hintLeft--;
  Sound.hint();
  showHint(hint);
  renderUndoHintUI();
  autoSave();
}

// ── Palette select ──
function selectPaletteHandler(key) {
  state.palette = key;
  localStorage.setItem(LS_PALETTE, key);
  applyPalette(key);
  $$('.palette-option').forEach(o => o.classList.toggle('active', o.dataset.palette === key));
  renderBoard(); renderPreview();
  autoSave();
}

// ── Sound UI ──
function updateSoundUI() {
  const icon = $('#sound-icon'), label = $('#sound-label'), btn = $('#sound-toggle');
  if (!icon) return;
  if (Sound.enabled) {
    icon.textContent = 'volume_up'; label.textContent = 'Âm thanh'; btn.classList.remove('muted');
  } else {
    icon.textContent = 'volume_off'; label.textContent = 'Tắt tiếng'; btn.classList.add('muted');
  }
}

let isDragging = false;
let lastHoveredCell = null;

// ── Events ──
function setupEvents() {
  const boardEl = $('#game-board');

  // Board — use pointerdown for select and classic tap-to-move
  boardEl.addEventListener('pointerdown', (e) => {
    if (state.animating || state.gameOver) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    e.preventDefault();
    Sound.resume();

    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    const val = state.board[r][c];

    if (val !== 0) {
      // Click ball
      if (state.selected && state.selected.row === r && state.selected.col === c) {
        state.selected = null;
        Sound.deselect();
        Haptics.light();
        clearPath();
      } else {
        state.selected = { row: r, col: c };
        Sound.select();
        Haptics.light();
        clearHint();
      }
      isDragging = true;
      lastHoveredCell = null;
      renderBoard();
    } else {
      // Classic tap to move
      if (state.selected) {
        executeMove(r, c);
      }
      isDragging = false;
      lastHoveredCell = null;
    }
  });

  // pointermove on document to handle drag path preview (both desktop hover and mobile drag)
  document.addEventListener('pointermove', (e) => {
    if (!state.selected || state.animating || state.gameOver) return;

    let cell = null;
    if (e.pointerType === 'touch') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      cell = el ? el.closest('.cell') : null;
    } else {
      cell = e.target.closest('.cell');
    }

    if (!cell) {
      clearPath();
      lastHoveredCell = null;
      return;
    }

    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);

    if (r === state.selected.row && c === state.selected.col) {
      clearPath();
      lastHoveredCell = null;
      return;
    }

    if (state.board[r][c] === 0) {
      const path = findPath(state.selected.row, state.selected.col, r, c);
      if (path) {
        const color = state.board[state.selected.row][state.selected.col];
        drawPath(path, color);
        lastHoveredCell = { row: r, col: c };
      } else {
        clearPath();
        lastHoveredCell = null;
      }
    } else {
      clearPath();
      lastHoveredCell = null;
    }
  });

  // pointerup on document to complete drag-to-drop action
  document.addEventListener('pointerup', (e) => {
    if (isDragging && lastHoveredCell) {
      executeMove(lastHoveredCell.row, lastHoveredCell.col);
    }
    isDragging = false;
    lastHoveredCell = null;
    clearPath();
  });

  // Buttons
  $('#new-game-btn').addEventListener('click', () => {
    Sound.resume();
    if (state.moves > 0 && !state.gameOver && !confirm('Bắt đầu ván mới?')) return;
    startNewGame();
  });
  $('#restart-btn').addEventListener('click', () => { Sound.resume(); startNewGame(); });
  $('#undo-btn').addEventListener('click', () => undo());
  $('#hint-btn').addEventListener('click', () => useHint());

  // Sound
  $('#sound-toggle').addEventListener('click', () => {
    Sound.enabled = !Sound.enabled;
    localStorage.setItem(LS_SOUND, Sound.enabled);
    updateSoundUI();
    if (Sound.enabled) { Sound.resume(); Sound.select(); }
  });

  // Palette Modal
  $('#palette-toggle').addEventListener('click', () => {
    $('#palette-modal').classList.add('visible');
  });
  $('#close-palette-btn').addEventListener('click', () => {
    $('#palette-modal').classList.remove('visible');
  });
  $('#palette-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#palette-modal').classList.remove('visible');
  });
  $('#palette-options-container').addEventListener('click', (e) => {
    const opt = e.target.closest('.palette-option');
    if (opt) {
      selectPaletteHandler(opt.dataset.palette);
      $('#palette-modal').classList.remove('visible');
    }
  });

  // Checkpoint Modal
  $('#checkpoint-toggle').addEventListener('click', () => {
    $('#checkpoint-modal').classList.add('visible');
    renderCheckpointSlots();
  });
  $('#close-checkpoint-btn').addEventListener('click', () => {
    $('#checkpoint-modal').classList.remove('visible');
  });
  $('#checkpoint-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#checkpoint-modal').classList.remove('visible');
  });

  // Checkpoint save/load actions
  document.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('.cp-save');
    const loadBtn = e.target.closest('.cp-load');
    if (saveBtn) {
      const slot = saveBtn.dataset.slot;
      saveCheckpoint(slot);
      Sound.checkpoint();
      showToast(`💾 Đã lưu checkpoint ${+slot + 1}`);
      renderCheckpointSlots();
    }
    if (loadBtn) {
      const slot = loadBtn.dataset.slot;
      if (loadCheckpoint(slot)) {
        Sound.checkpoint();
        hideGameOver();
        $('#checkpoint-modal').classList.remove('visible');
        renderBoard(); renderPreview(); renderScore(); renderStats(); renderUndoHintUI();
        startTimer();
        autoSave();
        showToast(`▶ Đã tải checkpoint ${+slot + 1}`);
      }
    }
  });

  // Load checkpoint from game-over screen
  const lcBtn = $('#load-checkpoint-btn');
  if (lcBtn) lcBtn.addEventListener('click', () => {
    hideGameOver();
    $('#checkpoint-modal').classList.add('visible');
    renderCheckpointSlots();
  });

  // Leaderboard Modal
  $('#leaderboard-btn').addEventListener('click', async () => {
    showLeaderboard(getLeaderboard(), null);
    try {
      const globalData = await getGlobalLeaderboard();
      showLeaderboard(globalData, null);
    } catch (err) {
      console.error("Could not fetch global leaderboard:", err);
    }
  });
  $('#close-leaderboard-btn').addEventListener('click', hideLeaderboard);
  $('#leaderboard-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideLeaderboard();
  });
  $('#game-over-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget && state.gameOver) { /* don't close on backdrop */ }
  });

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    // Ignore hotkeys when typing in inputs
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return; }
    switch (e.key.toLowerCase()) {
      case 'h': if (!e.ctrlKey) useHint(); break;
      case 'n': if (!e.ctrlKey && !e.altKey) {
        if (state.moves > 0 && !state.gameOver && !confirm('Bắt đầu ván mới?')) return;
        startNewGame();
        break;
      }
      case 'm': if (!e.ctrlKey) {
        Sound.enabled = !Sound.enabled;
        localStorage.setItem(LS_SOUND, Sound.enabled);
        updateSoundUI();
        break;
      }
      case 'escape':
        if ($('#leaderboard-overlay').classList.contains('visible')) { hideLeaderboard(); break; }
        if ($('#palette-modal').classList.contains('visible')) { $('#palette-modal').classList.remove('visible'); break; }
        if ($('#checkpoint-modal').classList.contains('visible')) { $('#checkpoint-modal').classList.remove('visible'); break; }
        if (state.selected) { state.selected = null; clearHint(); renderBoard(); break; }
        break;
    }
  });

  // Pause timer when tab hidden
  document.addEventListener('visibilitychange', () => {
    // Timer auto-pauses via document.hidden check in interval
  });

  // Intercept back navigation / physical back button
  history.pushState(null, null, window.location.href);
  window.addEventListener('popstate', () => {
    if (state.moves > 0 && !state.gameOver) {
      if (confirm('Bạn có muốn thoát game không? Tiến trình chơi sẽ được tự động lưu.')) {
        history.back();
      } else {
        history.pushState(null, null, window.location.href);
      }
    }
  });

  // Intercept reload / page close
  window.addEventListener('beforeunload', (e) => {
    if (state.moves > 0 && !state.gameOver) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ── Firebase Auth & Sync ──
function generateRandomNickname() {
  const adjs = ["Thần Bí", "Lấp Lánh", "Kỳ Diệu", "Huyền Thoại", "Ma Thuật", "Siêu Cấp", "Vô Địch", "Thần Tốc", "Nhiệm Màu", "Vui Vẻ"];
  const nouns = ["Phù Thủy", "Chiến Binh", "Tinh Linh", "Hiệp Sĩ", "Thần Thú", "Ninja", "Ảo Thuật Gia", "Nhà Thám Hiểm", "Phi Hành Gia", "Học Giả"];
  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${noun} ${adj} #${num}`;
}

function getFriendlyAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return "⚠️ Email không đúng định dạng!";
    case 'auth/weak-password':
      return "⚠️ Mật khẩu quá yếu (tối thiểu 6 ký tự)!";
    case 'auth/email-already-in-use':
      return "⚠️ Email này đã đăng ký tài khoản khác!";
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return "❌ Sai Email hoặc Mật khẩu!";
    case 'auth/operation-not-allowed':
      return "❌ Đăng nhập Email chưa được bật!";
    case 'auth/too-many-requests':
      return "⚠️ Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau!";
    case 'auth/network-request-failed':
      return "🌐 Lỗi kết nối mạng. Vui lòng kiểm tra lại!";
    case 'auth/credential-already-in-use':
      return "⚠️ Tài khoản đã liên kết với một tiến trình khác!";
    default:
      return "❌ Thao tác thất bại. Vui lòng thử lại!";
  }
}

function setupFirebaseAuth() {
  const accountModal = $('#account-modal');
  if (!accountModal) {
    console.warn("Account modal element not found in DOM.");
    return;
  }
  const closeBtn = $('#close-account-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => accountModal.classList.remove('visible'));
  accountModal.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) accountModal.classList.remove('visible');
  });

  // Google Sign-in button listener (inside account modal)
  $('#modal-google-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    showToast("🔑 Đang mở đăng nhập Google...");
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(user, provider);
      showToast("🎉 Liên kết tài khoản Google thành công!");
      accountModal.classList.remove('visible');
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        if (confirm("Tài khoản Google này đã được liên kết với một tiến trình khác. Bạn có muốn chuyển sang tài khoản này (tiến trình hiện tại trên thiết bị sẽ bị thay thế)?")) {
          try {
            showToast("🔑 Đang chuyển tài khoản...");
            await signInWithRedirect(auth, provider);
          } catch (err) {
            console.error("Direct Google Sign-in error:", err);
            showToast(getFriendlyAuthErrorMessage(err.code));
          }
        }
      } else {
        console.error("Google linking error:", error);
        showToast(getFriendlyAuthErrorMessage(error.code));
      }
    }
  });

  // Email Sign In form submission
  $('#email-auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#auth-email').value;
    const password = $('#auth-password').value;
    showToast("🔐 Đang đăng nhập...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("👋 Đăng nhập thành công!");
      accountModal.classList.remove('visible');
      $('#auth-email').value = '';
      $('#auth-password').value = '';
    } catch (err) {
      console.error("Email sign-in error:", err);
      showToast(getFriendlyAuthErrorMessage(err.code));
    }
  });

  // Email Sign Up button action
  $('#email-signup-btn').addEventListener('click', async () => {
    const email = $('#auth-email').value;
    const password = $('#auth-password').value;
    if (!email || !password) {
      showToast("⚠️ Vui lòng điền đầy đủ Email và Mật khẩu!");
      return;
    }
    if (password.length < 6) {
      showToast("⚠️ Mật khẩu phải có tối thiểu 6 ký tự!");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    showToast("📝 Đang đăng ký...");
    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);
      showToast("🎉 Đã tạo và liên kết tài khoản Email!");
      accountModal.classList.remove('visible');
      $('#auth-email').value = '';
      $('#auth-password').value = '';
    } catch (err) {
      console.error("Email sign-up error:", err);
      showToast(getFriendlyAuthErrorMessage(err.code));
    }
  });

  // Sign out button
  $('#account-signout-btn').addEventListener('click', async () => {
    if (confirm("Bạn có muốn đăng xuất khỏi tài khoản hiện tại không?")) {
      showToast("🚪 Đang đăng xuất...");
      try {
        await signOut(auth);
        accountModal.classList.remove('visible');
        showToast("🚪 Đã đăng xuất!");
      } catch (err) {
        console.error("Sign out error:", err);
        showToast("❌ Lỗi đăng xuất!");
      }
    }
  });

  // Firebase Auth Observer
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("Firebase Auth State: Logged in as", user.uid, user.isAnonymous ? "Anonymous" : user.displayName);
      
      if (user.isAnonymous && !user.displayName) {
        const nickname = generateRandomNickname();
        try {
          await updateProfile(user, { displayName: nickname });
          console.log("Profile updated with nickname:", nickname);
        } catch (err) {
          console.error("Profile update error:", err);
        }
      }

      updateUserUI(user);
      
      // Show toast and synchronize progress
      showToast("🔄 Đang đồng bộ dữ liệu...");
      const needsReload = await syncUserProgress(user);
      if (needsReload) {
        showToast("✅ Đã đồng bộ tiến trình từ Cloud!");
        if (loadSavedGame()) {
          renderBoard();
          renderPreview();
          renderScore();
          renderStats();
          renderUndoHintUI();
        }
        renderCheckpointSlots();
      } else {
        showToast("✅ Tiến trình đã được đồng bộ!");
      }
    } else {
      console.log("Firebase Auth State: No user. Signing in anonymously...");
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Anonymous login error:", err);
        showToast("❌ Lỗi đăng nhập Firebase!");
      }
    }
  });

  // Profile button listener on header
  const loginBtn = $('#google-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      accountModal.classList.add('visible');
      updateAccountModalUI(auth.currentUser);
    });
  }
}

function updateAccountModalUI(user) {
  const profileView = $('#account-profile-view');
  const loginView = $('#account-login-view');
  if (!user) return;

  if (user.isAnonymous) {
    profileView.style.display = 'none';
    loginView.style.display = 'block';
    $('#modal-anon-name').textContent = user.displayName || "Khách ẩn danh";
  } else {
    profileView.style.display = 'block';
    loginView.style.display = 'none';
    
    const avatarImg = $('#modal-user-avatar');
    const avatarIcon = $('#modal-user-icon');
    
    if (user.photoURL) {
      avatarImg.src = user.photoURL;
      avatarImg.style.display = 'inline-block';
      avatarIcon.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarIcon.style.display = 'inline-block';
      avatarIcon.textContent = 'face';
    }
    
    $('#modal-user-name').textContent = user.displayName || "Người chơi";
    $('#modal-user-email').textContent = user.email || "";
    
    const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
    const badge = $('#modal-user-badge');
    badge.textContent = isGoogle ? "Google" : "Email";
    badge.style.background = isGoogle ? "#4285F4" : "var(--primary-pink)";
  }
}

function updateUserUI(user) {
  const avatarIcon = $('#user-avatar-icon');
  const avatarImg = $('#user-avatar-img');
  const loginBtn = $('#google-login-btn');
  if (!loginBtn) return;

  if (user.isAnonymous) {
    if (avatarImg) avatarImg.style.display = 'none';
    if (avatarIcon) {
      avatarIcon.style.display = 'inline-block';
      avatarIcon.textContent = 'account_circle';
    }
    loginBtn.title = "Tài khoản (Ẩn danh)";
  } else {
    if (user.photoURL) {
      if (avatarImg) {
        avatarImg.src = user.photoURL;
        avatarImg.style.display = 'inline-block';
      }
      if (avatarIcon) avatarIcon.style.display = 'none';
    } else {
      if (avatarImg) avatarImg.style.display = 'none';
      if (avatarIcon) {
        avatarIcon.style.display = 'inline-block';
        avatarIcon.textContent = 'face';
      }
    }
    loginBtn.title = `Tài khoản: ${user.displayName || user.email}`;
  }
  
  const accountModal = $('#account-modal');
  if (accountModal && accountModal.classList.contains('visible')) {
    updateAccountModalUI(user);
  }
}

// ── Boot ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
