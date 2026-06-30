import { state, resetState, cloneSnapshot, restoreSnapshot } from './core/state.js';
import { generateNextBalls, spawnBalls, checkLines, checkAllNewBalls, calculateScore, analyzeMove } from './core/logic.js';
import { findPath } from './core/pathfinding.js';
import { clearHistory, logEvent, exportReplay, getHistory } from './core/replay.js';
import { viewport } from './render/viewport.js';
import { screenTransform } from './fx/camera.js';
import { particleSystem } from './fx/particles.js';
import { tweenManager } from './fx/tween.js';
import { scheduler } from './core/scheduler.js';
import { hud } from './ui/hud.js';
import { modal } from './ui/modal.js';
import { challenge } from './ui/challenge.js';
import { analytics } from './ui/analytics.js';
import { profiler } from './ui/profiler.js';
import { MOVE_STEP_MS } from './core/constants.js';
import { Sound } from './audio/sound.js';

// ── Firebase / Online ──
import { auth } from '../../shared/firebase.js';
import { initSharedAuth, showAuthModal, showToast } from '../../shared/auth.js';
import { submitScore, fetchLeaderboard, fetchMyRank } from './storage/leaderboard.js';
import { cloudSave, cloudLoad, cloudDelete, detectConflict } from './storage/save.js';
import { shareReplay, verifyReplay } from './storage/replay-share.js';

// Global variables for movement animation
let isMoving = false;

// Global variable for path tracking
window.currentPath = null;

// Firebase user reference
let currentUser = null;
let bestSubmittedScore = 0;

function startTimer() {
	if (state.timerInterval) return;
	state.timerInterval = setInterval(() => {
		if (!state.gameOver && !state.animating && !isMoving) {
			state.elapsedTime++;
			hud.update();
		}
	}, 1000);
}

function stopTimer() {
	if (state.timerInterval) {
		clearInterval(state.timerInterval);
		state.timerInterval = null;
	}
}

function loadSavedGame() {
	const raw = localStorage.getItem('lines98_save');
	if (!raw) return false;
	try {
		const data = JSON.parse(raw);
		if (!data.board || data.board.length === 0) return false;
		restoreSnapshot(data);
		if (data.undoStack) {
			state.undoStack = data.undoStack.map(snap => ({ ...snap }));
		}
		return true;
	} catch (err) {
		console.error("Error loading saved game:", err);
		return false;
	}
}

function init() {
	console.log("Lines 98 Remastered starting up...");

	// 1. Initialize Viewport (Canvas) & HUD
	const canvas = document.createElement('canvas');
	canvas.id = 'game-canvas';
	canvas.className = 'w-full h-full block cursor-pointer select-none';

	const board = document.getElementById('game-board');
	if (board) {
		board.innerHTML = '';
		board.appendChild(canvas);
	}

	viewport.initialize(canvas);
	hud.initialize();
	modal.initialize();
	challenge.initialize();
	profiler.initialize();

	// 2. Setup Responsive Resize
	window.addEventListener('resize', () => {
		viewport.resize();
		hud.update();
	});

	// 3. Setup Input Event Listeners
	setupInputListeners(canvas);

	// 4. Setup Controls
	setupControlListeners();

	// 5. Initialize Audio
	Sound.init();

	// 6. Load or Start New Game
	const savedHigh = localStorage.getItem('lines98_highScore');
	if (savedHigh) {
		state.highScore = parseInt(savedHigh, 10) || 0;
	}

	if (!loadSavedGame()) {
		startNewGame();
	} else {
		startTimer();
		hud.update();
	}

	// 7. Initialize Firebase Auth + Online features
	initSharedAuth({
		onUserChanged: (user) => {
			currentUser = user;
			bestSubmittedScore = 0; // reset khi user thay đổi (anonymous → google)
			_updateUserAvatar(user);
			if (!user.isAnonymous) {
				_autoCloudSync(user);
			}
		},
		syncProgress: (user) => {
			if (!user.isAnonymous && !state.gameOver) {
				_autoCloudSync(user);
			}
		},
	});

	// 8. Wire leaderboard button
	const leaderboardBtn = document.getElementById('leaderboard-btn');
	if (leaderboardBtn) {
		leaderboardBtn.addEventListener('click', () => {
			_openLeaderboard();
		});
	}

	// 9. Wire share replay button (delegation for dynamic buttons)
	document.addEventListener('click', (e) => {
		if (e.target.closest('#share-replay-btn')) {
			_handleShareReplay();
		}
	});

	// 10. Start Loop
	lastTime = performance.now();
	requestAnimationFrame(gameLoop);
}

let lastTime = 0;
function gameLoop(now) {
	let dt = now - lastTime;
	if (dt > 100) dt = 16.67; // Cap spikes (e.g. background tab)
	lastTime = now;

	profiler.resetFrame();

	// Logic timing
	const t1 = performance.now();
	scheduler.update(dt);
	tweenManager.update(dt);
	const t2 = performance.now();
	profiler.logicTime = t2 - t1;

	// Particle timing
	const t3 = performance.now();
	particleSystem.update(dt);
	const t4 = performance.now();
	profiler.particleTime = t4 - t3;

	// FX timing
	const t5 = performance.now();
	screenTransform.update(dt);
	const t6 = performance.now();
	profiler.fxTime = t6 - t5;

	// Update smooth move animation
	if (window.moveAnim) {
		const anim = window.moveAnim;
		anim.progress = Math.min(1, anim.progress + dt / anim.totalDuration);
		if (anim.progress >= 1) {
			window.moveAnim = null;
			state.board[anim.endRow][anim.endCol] = anim.color;
			finalizeMove(anim.path, anim.color);
		}
	}

	// Render timing
	const t7 = performance.now();
	viewport.draw(dt);
	const t8 = performance.now();
	profiler.renderTime = t8 - t7;
	profiler.drawCalls = viewport.drawCallCount || 0;

	// Update profiler (after draw to capture full frame time)
	profiler.update(dt, now);

	requestAnimationFrame(gameLoop);
}

function startNewGame() {
	bestSubmittedScore = 0;
	const seed = state.challenge.active
		? challenge.getDailySeed()
		: Math.floor(Math.random() * 2147483647);
	resetState(seed);
	clearHistory();
	particleSystem.clear();
	tweenManager.clear();
	screenTransform.reset();

	// Activate daily challenge
	_activateChallenge();

	// Log start
	logEvent({ type: 'START', seed });

	// Initial spawn
	const spawned = spawnBalls(5);
	logEvent({ type: 'SPAWN', balls: spawned });

	// Pre-generate next balls
	generateNextBalls();

	// Update UI HUD
	hud.update();
	isMoving = false;
	window.currentPath = null;
	startTimer();
}

function _activateChallenge() {
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	// Reset goals if it's a new day or challenge not yet active
	if (state.challenge.dateStr !== today) {
		state.challenge.dateStr = today;
		state.challenge.goals.forEach(g => { g.progress = 0; g.done = false; });
		state.challenge.completed = false;
	}
	state.challenge.active = true;

	challenge.initialize();
	challenge.update();
}

function setupInputListeners(canvas) {
	// Translate mouse/touch to grid index
	const getCellFromEvent = (e) => {
		const rect = canvas.getBoundingClientRect();
		let clientX, clientY;

		if (e.touches && e.touches.length > 0) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			clientX = e.clientX;
			clientY = e.clientY;
		}

		const x = clientX - rect.left;
		const y = clientY - rect.top;
		return viewport.getCellFromPixels(x, y);
	};

	const handlePointerMove = (e) => {
		if (state.gameOver || state.animating || isMoving) return;
		const cell = getCellFromEvent(e);

		if (cell) {
			viewport.hoveredCell = cell;

			// Dynamic path preview (P0)
			if (state.selected) {
				if (state.selected.row === cell.row && state.selected.col === cell.col) {
					window.currentPath = null;
				} else {
					window.currentPath = findPath(state.selected.row, state.selected.col, cell.row, cell.col);
				}
			}
		} else {
			viewport.hoveredCell = null;
			window.currentPath = null;
		}
	};

	const handlePointerDown = (e) => {
		e.preventDefault();
		if (state.gameOver || state.animating || isMoving) return;

		const cell = getCellFromEvent(e);
		if (cell) {
			viewport.hoveredCell = cell; // highlight ngay khi chạm
		}
		if (!cell) return;

		const color = state.board[cell.row][cell.col];

		if (color > 0) {
			// 1. Select Ball
			if (state.selected && state.selected.row === cell.row && state.selected.col === cell.col) {
				// Click same ball → deselect
				state.selected = null;
				window.currentPath = null;
				Sound.deselect();
				return;
			}
			state.selected = { row: cell.row, col: cell.col };
			window.currentPath = null;
			Sound.select();
			// Add a small scale bounce tween on selection
			tweenManager.killTweensOf(state.selected);
			// Selected pulse is handled continuously inside viewport
		} else if (state.selected) {
			// 2. Move Ball (if path exists)
			const path = findPath(state.selected.row, state.selected.col, cell.row, cell.col);
			if (path) {
				executeMovement(path);
			} else {
				Sound.noPath();
				// Shake the cell to show blocked path
				state.selected = null;
				window.currentPath = null;
			}
		}
	};

	canvas.addEventListener('mousemove', handlePointerMove);
	canvas.addEventListener('mousedown', handlePointerDown);

	canvas.addEventListener('touchmove', handlePointerMove);
	canvas.addEventListener('touchstart', handlePointerDown);
	canvas.addEventListener('touchend', () => {
		viewport.hoveredCell = null;
		window.currentPath = null;
	});
	canvas.addEventListener('mouseup', () => {
		viewport.hoveredCell = null;
		window.currentPath = null;
	});
}

function executeMovement(path) {
	isMoving = true;
	state.animating = true;
	window.currentPath = null;

	// Preserve state for undo
	state.undoStack = [cloneSnapshot()];

	const startCell = path[0];
	const endCell = path[path.length - 1];
	const color = state.board[startCell.row][startCell.col];

	// Clear ball from board — viewport will render it at interpolated position
	state.board[startCell.row][startCell.col] = 0;

	// Zoom camera during movement
	screenTransform.setZoom(1.04);

	window.moveAnim = {
		path,
		progress: 0,
		color,
		endRow: endCell.row,
		endCol: endCell.col,
		totalDuration: (path.length - 1) * MOVE_STEP_MS,
	};
}

function finalizeMove(path, color) {
	const start = path[0];
	const end = path[path.length - 1];

	isMoving = false;
	state.animating = false;
	state.selected = null;

	// Restore camera zoom
	screenTransform.setZoom(1.0);

	// Play landing sound effect
	Sound.land();

	// Log move event
	logEvent({ type: 'MOVE', from: [start.row, start.col], to: [end.row, end.col] });

	// Increment moves turn
	state.turn++;

	// Check lines formed at destination
	const clearedList = checkLines(end.row, end.col);

	// Analyze move quality for player feedback
	const moveQuality = analyzeMove(start.row, start.col, end.row, end.col, clearedList.length);
	if (!state.gameOver && clearedList.length < 5) {
		const qualityEmoji = moveQuality === 'Excellent' ? '✨' : moveQuality === 'Risky' ? '⚠️' : '👍';
		hud.spawnFloatingText(`${qualityEmoji} ${moveQuality}`, end.row, end.col, moveQuality === 'Excellent');
	}

	if (clearedList.length >= 5) {
		// 1. Cleared Lines!
		Sound.clear(clearedList.length);
		handleLineClears(clearedList);
	} else {
		// 2. Spawn 3 new balls
		const spawned = spawnBalls(3);
		Sound.spawn();
		logEvent({ type: 'SPAWN', balls: spawned });

		const spawnedClears = checkAllNewBalls(spawned.map(b => ({ row: b[0], col: b[1] })));
		if (spawnedClears.length >= 5) {
			Sound.clear(spawnedClears.length);
			handleLineClears(spawnedClears);
		}

		// Pre-generate next preview balls
		generateNextBalls();
	}

	// Check game over
	const empties = state.board.flat().filter(cell => cell === 0);
	if (empties.length === 0) {
		state.gameOver = true;
		stopTimer();
		Sound.gameOver();
		showGameOverModal();
		saveGameProgress();
		return;
	}

	// Sync highscore
	if (state.score > state.highScore) {
		state.highScore = state.score;
		localStorage.setItem('lines98_highScore', state.highScore);
	}

	// Update challenge progress
	challenge.update();

	// Update HUD
	hud.update();
	saveGameProgress();
}

function handleLineClears(cells) {
	const scoreDelta = calculateScore(cells.length);
	state.score += scoreDelta;
	state.ballsCleared += cells.length;
	_submitHighScoreIfNeeded();
	state.totalLinesCleared++;

	logEvent({ type: 'CLEAR', cells: cells.map(c => [c.row, c.col]), scoreDelta });

	// Camera Shake on eating balls
	screenTransform.shake(8, 400);

	// Spawn crystal shards explosion particles
	cells.forEach(cell => {
		const coords = viewport.getCellCoords(cell.row, cell.col);
		const pixelX = coords.x + viewport.cellSize / 2;
		const pixelY = coords.y + viewport.cellSize / 2;
		const color = state.board[cell.row][cell.col];

		particleSystem.spawnExplosion(pixelX, pixelY, color);

		// Clear board cells
		state.board[cell.row][cell.col] = 0;
	});

	// Spawn combo celebrate notification floating text
	const centerCell = cells[Math.floor(cells.length / 2)];
	let txt = `+${scoreDelta}`;
	if (cells.length > 5) txt += " COMBO! 🔥";
	hud.spawnFloatingText(txt, centerCell.row, centerCell.col, cells.length > 5);
}

function undo() {
	if (state.undoStack.length === 0 || state.animating || state.gameOver) return;

	Sound.undo();
	const snap = state.undoStack.pop();
	restoreSnapshot(snap);
	particleSystem.clear();
	window.currentPath = null;

	challenge.update();
	hud.update();
	saveGameProgress();
}

function setupControlListeners() {
	const newGameBtn = document.getElementById('new-game-btn');
	if (newGameBtn) {
		newGameBtn.addEventListener('click', startNewGame);
	}

	const undoBtn = document.getElementById('undo-btn');
	if (undoBtn) {
		undoBtn.addEventListener('click', undo);
	}

	const soundBtn = document.getElementById('sound-toggle');
	if (soundBtn) {
		soundBtn.addEventListener('click', () => {
			state.soundEnabled = !state.soundEnabled;
			const icon = document.getElementById('sound-icon');
			if (icon) {
				icon.textContent = state.soundEnabled ? 'volume_up' : 'volume_off';
			}
		});
	}

	const restartBtn = document.getElementById('restart-btn');
	if (restartBtn) {
		restartBtn.addEventListener('click', () => {
			hideGameOverModal();
			startNewGame();
		});
	}

	const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
	if (closeLeaderboardBtn) {
		closeLeaderboardBtn.addEventListener('click', () => {
			document.getElementById('leaderboard-overlay')?.classList.remove('visible');
		});
	}
}

function saveGameProgress() {
	const raw = {
		...cloneSnapshot(),
		undoStack: state.undoStack.map(snap => ({ ...snap }))
	};
	localStorage.setItem('lines98_save', JSON.stringify(raw));
}

// Kick off initialization
window.addEventListener('DOMContentLoaded', init);

function showGameOverModal() {
	const overlay = document.getElementById('game-over-overlay');
	const finalScore = document.getElementById('final-score');
	const finalHigh = document.getElementById('final-high');
	if (finalScore) finalScore.textContent = state.score;
	if (finalHigh) finalHigh.textContent = state.highScore;

	// Populate analytics stats
	const stats = analytics.computeStats();
	const setText = (id, val) => {
		const el = document.getElementById(id);
		if (el) el.textContent = val;
	};
	setText('stat-turns', stats.turns);
	setText('stat-cleared-final', stats.ballsCleared);
	setText('stat-longest', stats.longestLine);
	setText('stat-efficiency', stats.efficiency);
	setText('stat-avgline', stats.avgLine);
	setText('stat-time-final', stats.time);

	// Render heatmap
	const heatCanvas = document.getElementById('heatmap-canvas');
	if (heatCanvas) analytics.renderHeatmap(heatCanvas);

	if (overlay) {
		overlay.classList.add('visible');
		overlay.querySelector('.game-over-overlay > div')?.classList.remove('scale-95');
	}

	// Auto-submit score to leaderboard if authenticated
	// Auto-submit score to leaderboard if authenticated
	if (currentUser) {
		submitScore({
			uid: currentUser.uid,
			displayName: currentUser.displayName || 'Anonymous',
			photoURL: currentUser.photoURL || '',
			score: state.score,
			turns: state.turn,
			ballsCleared: state.ballsCleared,
			longestLine: state.longestLine,
			replaySeed: state.seed,
			replayCode: exportReplay(),
		}).catch((err) => console.error('Score submit error:', err));
	}
}

function hideGameOverModal() {
	const overlay = document.getElementById('game-over-overlay');
	if (overlay) {
		overlay.classList.remove('visible');
	}
}

function _submitHighScoreIfNeeded() {
	if (!currentUser || state.score <= bestSubmittedScore || state.gameOver) return;
	bestSubmittedScore = state.score;
	submitScore({
		uid: currentUser.uid,
		displayName: currentUser.displayName || 'Anonymous',
		photoURL: currentUser.photoURL || '',
		score: state.score,
		turns: state.turn,
		ballsCleared: state.ballsCleared,
		longestLine: state.longestLine,
		replaySeed: state.seed,
		replayCode: exportReplay(),
	}).catch((err) => console.error('Auto submit error:', err));
}

// ── Online Feature Helpers ──

function _updateUserAvatar(user) {
	const icon = document.getElementById('user-avatar-icon');
	const img = document.getElementById('user-avatar-img');
	if (!icon || !img) return;

	if (user.photoURL) {
		icon.style.display = 'none';
		img.style.display = 'block';
		img.src = user.photoURL;
	} else {
		icon.style.display = 'inline';
		img.style.display = 'none';
		img.src = '';
	}
}

async function _autoCloudSync(user) {
	try {
		// Check if we need to sync local data to cloud first
		const syncPending = sessionStorage.getItem('sync_pending');
		if (syncPending) {
			sessionStorage.removeItem('sync_pending');
			const localRaw = sessionStorage.getItem('pre_sync_local');
			sessionStorage.removeItem('pre_sync_local');
			if (localRaw) {
				try {
					const localData = JSON.parse(localRaw);
					const syncPayload = {
						...localData,
						uid: user.uid,
						_syncedAt: Date.now(),
					};
					await cloudSave(syncPayload);
					// Restore local state
					restoreSnapshot(localData);
					if (localData.undoStack) {
						state.undoStack = localData.undoStack.map(snap => ({ ...snap }));
					}
					hud.update();
					challenge.update();
					// Clear local save since it's now in cloud
					localStorage.removeItem('lines98_save');
					console.log('Synced local data to cloud');
					return;
				} catch (err) {
					console.error('Sync upload error:', err);
				}
			}
		}

		const cloudData = await cloudLoad(user.uid);
		if (cloudData && cloudData.exists()) {
			const remote = cloudData.data();
			const local = cloneSnapshot();
			const conflict = detectConflict(local, remote);
			if (conflict) {
				// Keep whichever has higher score
				if (remote.score > state.score) {
					restoreSnapshot(remote);
					hud.update();
					challenge.update();
					console.log('Synced from cloud (higher score)');
				}
			}
		}
		// Save current progress to cloud
		await cloudSave(cloneSnapshot());
	} catch (err) {
		console.error('Cloud sync error:', err);
	}
}

async function _openLeaderboard() {
	const overlay = document.getElementById('leaderboard-overlay');
	const list = document.getElementById('leaderboard-list');
	if (!overlay || !list) return;

	overlay.classList.add('visible');
	list.innerHTML = '<div class="text-center text-sm text-slate-400 py-4">⏳ Đang tải...</div>';

	try {
		const entries = await fetchLeaderboard(10);
		if (entries.length === 0) {
			list.innerHTML =
				'<div class="text-center text-sm text-slate-400 py-4">🏆 Chưa có điểm nào. Hãy là người đầu tiên!</div>';
		} else {
			list.innerHTML = entries
				.map(
					(entry, i) => `
					<div class="flex items-center gap-2.5 bg-white/40 dark:bg-slate-800/30 rounded-xl px-3.5 py-2.5 border border-white/30 dark:border-slate-700/30 transition-all hover:bg-white/60 dark:hover:bg-slate-800/40">
						<span class="font-display font-bold text-sm w-6 text-center ${i === 0
							? 'text-yellow-500'
							: i === 1
								? 'text-slate-400'
								: i === 2
									? 'text-amber-600'
									: 'text-slate-500'
						}">${i + 1}</span>
						<img class="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 object-cover" src="${entry.photoURL || ''
						}" alt="" onerror="this.style.display='none'" />
						<span class="flex-1 font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">${entry.displayName || 'Ẩn danh'
						}</span>
						<span class="font-display font-bold text-sm text-brand-pink dark:text-brand-purple">${entry.score}</span>
					</div>
				`
				)
				.join('');
		}

		if (currentUser && state.score > 0) {
			const rank = await fetchMyRank(state.score);
			if (rank) {
				const rankEl = document.createElement('div');
				rankEl.className =
					'text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-white/30 dark:border-slate-700/30 mt-2';
				rankEl.textContent = `📍 Bạn đang đứng hạng #${rank}`;
				list.appendChild(rankEl);
			}
		}
	} catch (err) {
		console.error('Leaderboard fetch error:', err);
		list.innerHTML = '<div class="text-center text-sm text-red-400 py-4">❌ Không thể tải bảng xếp hạng</div>';
	}
}

function _handleShareReplay() {
	const code = shareReplay();
	if (code) {
		showToast('📋 Đã sao chép mã replay!');
	} else {
		showToast('❌ Không có replay để chia sẻ');
	}
}
