import { state, saveLanternsState, syncUserAuraProgress } from "./state.js";
import { setupUI, showToast } from "./ui.js";
import { setupWebcam, getCameraDevices } from "./camera.js";
import { loadHandLandmarkerModel, drawHandSkeleton } from "./ai.js";
import { initDarkVeil, updateDarkVeil, drawDarkVeil, triggerVeilClear } from "./dark-veil.js";
import { drawFaceFilter } from "./filters/index.js";
import { initAudio } from "./audio.js";
import { createGameLoop, shouldRunTask } from "./game-loop.js";
import { updateTracking } from "./runtime/tracking-system.js";
import { updatePerformanceState } from "./runtime/perf-system.js";
import { updateLanterns, renderLanterns } from "./runtime/lantern-system.js";
import { initSharedAuth } from "../../shared/auth.js";

const LANTERN_SAVE_INTERVAL_MS = 500;

// DOM references
let video = null;
let canvas = null;
let ctx = null;
let loadingScreen = null;
let loadingStatus = null;
let startButton = null;
let appStartPromise = null;
let autoStartAttempted = false;
let gameLoop = null;
let debugErrorOverlay = null;
let debugErrorMeta = null;
let debugErrorContent = null;
let debugErrorCopyButton = null;
let debugErrorCloseButton = null;
let lastDebugErrorText = "";
let statFps = null;

const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';

function getLanternUpdateCadenceMs() {
	const quality = state.engine.performance.effectQuality || 'high';
	if (quality === 'low') return 66;
	if (quality === 'medium') return 48;
	return 33;
}

function initDomRefs() {
	if (!video) video = document.getElementById('webcam');
	if (!canvas) canvas = document.getElementById('canvas-overlay');
	if (canvas && !ctx) ctx = canvas.getContext('2d');
	if (!loadingScreen) loadingScreen = document.getElementById('loading-screen');
	if (!loadingStatus) loadingStatus = document.getElementById('loading-status');
	if (!startButton) startButton = document.getElementById('btn-start-app');
	if (!statFps) statFps = document.getElementById('fps-stat');
	if (!debugErrorOverlay) debugErrorOverlay = document.getElementById('debug-error-overlay');
	if (!debugErrorMeta) debugErrorMeta = document.getElementById('debug-error-meta');
	if (!debugErrorContent) debugErrorContent = document.getElementById('debug-error-content');
	if (!debugErrorCopyButton) debugErrorCopyButton = document.getElementById('btn-copy-debug-error');
	if (!debugErrorCloseButton) debugErrorCloseButton = document.getElementById('btn-close-debug-error');
}

function stringifyDebugValue(value) {
	if (value instanceof Error) {
		return [value.name || 'Error', value.message || '', value.stack || ''].filter(Boolean).join('\n');
	}

	if (typeof value === 'string') return value;

	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function showDebugError(args) {
	if (!debugEnabled) return;
	initDomRefs();
	if (!debugErrorOverlay || !debugErrorMeta || !debugErrorContent) return;

	const text = args.map((arg) => stringifyDebugValue(arg)).join('\n\n');
	const firstLine = text.split('\n')[0] || 'Unknown error';
	const timestamp = new Date().toLocaleTimeString();

	lastDebugErrorText = `[${timestamp}] ${text}`;
	debugErrorMeta.textContent = `${timestamp} | ${firstLine.slice(0, 140)}`;
	debugErrorContent.textContent = text;
	debugErrorOverlay.hidden = false;
}

async function copyDebugError() {
	if (!lastDebugErrorText) return;

	try {
		await navigator.clipboard.writeText(lastDebugErrorText);
		showToast('Đã copy lỗi debug');
	} catch {
		const textarea = document.createElement('textarea');
		textarea.value = lastDebugErrorText;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand('copy');
		document.body.removeChild(textarea);
		showToast('Đã copy lỗi debug');
	}
}

function setupDebugErrorOverlay() {
	initDomRefs();
	if (!debugEnabled || !debugErrorOverlay) return;

	debugErrorCopyButton?.addEventListener('click', () => {
		void copyDebugError();
	});

	debugErrorCloseButton?.addEventListener('click', () => {
		debugErrorOverlay.hidden = true;
	});

	if (!window.__AURA_DEBUG_CONSOLE_PATCHED__) {
		const originalConsoleError = console.error.bind(console);
		console.error = (...args) => {
			originalConsoleError(...args);
			showDebugError(args);
		};
		window.__AURA_DEBUG_CONSOLE_PATCHED__ = true;
	}
}

function beginFrame(frame) {
	initDomRefs();
	frame.videoReady = Boolean(video && canvas && ctx && video.readyState >= 2);
	frame.isMirrored = state.mirrorCamera;

	if (frame.videoReady && canvas.width !== video.videoWidth || frame.videoReady && canvas.height !== video.videoHeight) {
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
	}

	frame.canvasWidth = canvas?.width || 0;
	frame.canvasHeight = canvas?.height || 0;
	state.engine.frameId = frame.frameId;
	state.engine.lastDt = frame.dt;

	if (!frame.videoReady) return;

	ctx.clearRect(0, 0, frame.canvasWidth, frame.canvasHeight);
}

function updateFrame(frame) {
	const now = frame.now;
	updatePerformanceState(frame, statFps);

	if (!frame.videoReady) return;

	updateTracking(frame, video);

	for (let i = state.particles.length - 1; i >= 0; i--) {
		state.particles[i].update();
		if (state.particles[i].life <= 0) state.particles.splice(i, 1);
	}

	for (let i = state.prayerAuras.length - 1; i >= 0; i--) {
		state.prayerAuras[i].update();
		if (state.prayerAuras[i].done) state.prayerAuras.splice(i, 1);
	}

	if (shouldRunTask(frame, state.engine.tasks.lanternUpdate, getLanternUpdateCadenceMs(), state.lanterns.length > 0)) {
		updateLanterns(frame);
	}

	updateDarkVeil(now);
}

function renderFrame(frame) {
	if (!frame.videoReady) return;

	ctx.save();
	if (frame.isMirrored) {
		ctx.translate(frame.canvasWidth, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(video, 0, 0, frame.canvasWidth, frame.canvasHeight);

	if (state.showSkeleton && state.handResults?.landmarks) {
		state.handResults.landmarks.forEach((landmarks, index) => {
			const isRight = state.handResults.handednesses?.[index]?.[0]?.categoryName === "Right"
				|| index === 0;
			drawHandSkeleton(ctx, landmarks, isRight, frame.canvasWidth, frame.canvasHeight);
		});
	}

	if (state.activeFaceFilter !== 'none' && state.faceLandmarks) {
		drawFaceFilter(ctx, state.faceLandmarks, state.activeFaceFilter, frame.canvasWidth, frame.canvasHeight, frame.now);
	}

	ctx.restore();

	for (let i = state.particles.length - 1; i >= 0; i--) {
		state.particles[i].draw(ctx);
	}

	for (let i = state.prayerAuras.length - 1; i >= 0; i--) {
		state.prayerAuras[i].draw(ctx);
	}

	renderLanterns(ctx, frame);

	drawDarkVeil(ctx, frame.canvasWidth, frame.canvasHeight, frame.now);
}

function commitFrame(frame) {
	if (state.engine.dirtyFlags.lanterns && shouldRunTask(frame, state.engine.tasks.lanternSave, LANTERN_SAVE_INTERVAL_MS)) {
		saveLanternsState();
		state.engine.dirtyFlags.lanterns = false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook triggerVeilClear vào gesture trigger
// ─────────────────────────────────────────────────────────────────────────────
// Import triggerAuraEffects từ canvas-effects và wrap lại để gọi triggerVeilClear
// Thực ra ta override trong ai.js bằng cách export một hook.
// Approach đơn giản hơn: gọi triggerVeilClear từ analyzeHands qua callback trong state.
// → Ta dùng state.onGestureTrigger callback pattern.

function setupGestureHook() {
	// Mỗi khi gesture trigger → gọi triggerVeilClear
	// Điều này được thực hiện qua state.gestureActive thay đổi, detected trong renderLoop
	// Nhưng để chính xác, ta expose hook qua state
	state._onGestureTriggered = (effectX, midY) => {
		triggerVeilClear(effectX, midY);
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// startApp — khởi động ứng dụng
// ─────────────────────────────────────────────────────────────────────────────
async function startApp() {
	if (appStartPromise) return appStartPromise;

	appStartPromise = (async () => {
		console.log("[AuraApp] startApp() đã được gọi. readyState:", document.readyState);
		initDomRefs();

		// Xóa các theme- class cũ trước khi gán
		const themesToRemove = [];
		document.body.classList.forEach(cls => {
			if (cls.startsWith('theme-')) {
				themesToRemove.push(cls);
			}
		});
		themesToRemove.forEach(cls => document.body.classList.remove(cls));
		document.body.classList.add(`theme-${state.activePreset}`);

		// Hiển thị số phước đã tích
		const phuocDisplay = document.getElementById('phuoc-count-display');
		if (phuocDisplay) phuocDisplay.innerText = state.phuocCount;
		if (startButton) startButton.disabled = true;
		if (loadingStatus) loadingStatus.innerText = autoStartAttempted ? "Đang tự khởi động camera..." : "Đang mở camera...";

		// 1. Xin quyền và khởi động webcam trước để Safari không bị kẹt ở bước tải model
		const success = await setupWebcam(null, showToast);

		if (success) {
			if (loadingStatus) loadingStatus.innerText = "Đang tải mô hình nhận diện...";
			// 2. Tải mô hình AI sau khi camera đã được cấp quyền
			await loadHandLandmarkerModel();

			// 3. Thiết lập UI + event listeners
			setupUI();
			await getCameraDevices();
			navigator.mediaDevices.ondevicechange = getCameraDevices;

			// 4. Kích hoạt audio sau click đầu tiên (browser policy)
			document.body.addEventListener('click', () => initAudio(), { once: true });

			// 5. Khởi động Dark Veil
			initDarkVeil();
			setupGestureHook();

			if (!gameLoop) {
				gameLoop = createGameLoop({
					beginFrame,
					update: updateFrame,
					render: renderFrame,
					commit: commitFrame
				});
			}

			// 6. Khởi chạy render loop 60 FPS
			console.log("[AuraApp] Khởi chạy renderLoop 60 FPS!");
			gameLoop.start();
		} else {
			if (startButton) {
				startButton.hidden = false;
				startButton.disabled = false;
			}
			if (loadingStatus) {
				loadingStatus.innerText = "Không tự khởi động được camera. Hãy nhấn Bắt đầu trải nghiệm để thử lại.";
			}
			if (!state.lastCameraError) {
				console.error("[AuraApp] Webcam setup thất bại nhưng không có thông tin lỗi camera chi tiết.");
			}
		}
	})();

	try {
		await appStartPromise;
	} finally {
		if (!state.isCameraActive) {
			appStartPromise = null;
		}
	}
}

function updateAuraUserUI(user) {
	const avatarIcon = document.getElementById('user-avatar-icon');
	const avatarImg = document.getElementById('user-avatar-img');
	const loginBtn = document.getElementById('google-login-btn');
	const loginText = document.getElementById('google-login-text');
	if (!loginBtn) return;

	if (user.isAnonymous) {
		if (avatarImg) avatarImg.style.display = 'none';
		if (avatarIcon) {
			avatarIcon.style.display = 'inline-block';
			avatarIcon.textContent = 'account_circle';
		}
		if (loginText) loginText.textContent = 'Đăng nhập';
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
		if (loginText) {
			const name = user.displayName || user.email || "Đã đăng nhập";
			loginText.textContent = name.split(' ')[0] || "Tài khoản";
		}
		loginBtn.title = `Tài khoản: ${user.displayName || user.email}`;
	}
}

function initAuthAndPWA() {
	// 1. Unregister any active root-level Service Worker to resolve old caching traps
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistrations().then((registrations) => {
			for (const reg of registrations) {
				const scope = reg.scope;
				if (scope.endsWith('/for-u/') || scope.endsWith('/for-u/index.html')) {
					reg.unregister().then(() => {
						console.log('Root Service Worker active registration cleared from Aura:', scope);
						window.location.reload();
					});
				}
			}
		});
	}

	// 2. Setup Google sign-in auth and sync via shared auth module
	initSharedAuth({
		onUserChanged: (user) => {
			updateAuraUserUI(user);
		},
		syncProgress: async (user) => {
			showToast("🔄 Đang đồng bộ dữ liệu phước...");
			await syncUserAuraProgress(user);
			showToast("✅ Đã đồng bộ điểm phước!");
		},
		profileBtnSelector: '#google-login-btn'
	});
}

function setupStartButton() {
	initDomRefs();
	setupDebugErrorOverlay();
	initAuthAndPWA();
	if (startButton) {
		startButton.hidden = true;
		startButton.addEventListener('click', () => {
			autoStartAttempted = false;
			void startApp();
		});
	}

	if (!autoStartAttempted) {
		autoStartAttempted = true;
		void startApp();
	}
}

// ES Modules defer-safe init
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupStartButton);
} else {
	setupStartButton();
}
