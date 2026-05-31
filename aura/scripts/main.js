import { state, saveLanternsState } from "./state.js";
import { setupUI, showToast } from "./ui.js";
import { setupWebcam, getCameraDevices } from "./camera.js";
import { loadHandLandmarkerModel, drawHandSkeleton, analyzeHands } from "./ai.js";
import { initDarkVeil, updateDarkVeil, drawDarkVeil, triggerVeilClear } from "./dark-veil.js";
import { drawFaceFilter } from "./filters/index.js";
import { initAudio } from "./audio.js";
import { createGameLoop, shouldRunTask } from "./game-loop.js";

const HAND_DETECT_INTERVAL_MS = 33;
const FACE_DETECT_INTERVAL_MS = 66;
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

	// FPS counter
	state.frameCount++;
	if (now > state.lastFrameTime + 1000) {
		state.currentFps = Math.round((state.frameCount * 1000) / (now - state.lastFrameTime));
		if (statFps) statFps.innerText = state.currentFps;
		state.frameCount = 0;
		state.lastFrameTime = now;
	}

	if (!frame.videoReady) return;

	if (state.isModelLoaded) {
		const timestamp = frame.now;
		const handTask = state.engine.tasks.handDetect;
		const faceTask = state.engine.tasks.faceDetect;

		const hasNewHandVideoFrame = video.currentTime !== handTask.lastVideoTime;
		if (state.handLandmarker && shouldRunTask(frame, handTask, HAND_DETECT_INTERVAL_MS, hasNewHandVideoFrame)) {
			handTask.lastVideoTime = video.currentTime;
			try {
				const results = state.handLandmarker.detectForVideo(video, timestamp);
				state.handResults = analyzeHands(results, frame.canvasWidth, frame.canvasHeight) || results;
			} catch (err) {
				console.error("[AuraApp] Lỗi nhận diện tay:", err);
			}
		}

		if (state.activeFaceFilter !== 'none' && state.faceLandmarker) {
			const hasNewFaceVideoFrame = video.currentTime !== faceTask.lastVideoTime;
			if (shouldRunTask(frame, faceTask, FACE_DETECT_INTERVAL_MS, hasNewFaceVideoFrame)) {
				faceTask.lastVideoTime = video.currentTime;
				try {
					const faceResults = state.faceLandmarker.detectForVideo(video, timestamp);
					state.faceLandmarks = faceResults?.faceLandmarks?.[0] ?? null;
				} catch (err) {
					console.error("[AuraApp] Lỗi nhận diện gương mặt:", err);
				}
			}
		} else {
			state.faceLandmarks = null;
			faceTask.lastVideoTime = -1;
		}
	}

	for (let i = state.particles.length - 1; i >= 0; i--) {
		state.particles[i].update();
		if (state.particles[i].life <= 0) state.particles.splice(i, 1);
	}

	for (let i = state.prayerAuras.length - 1; i >= 0; i--) {
		state.prayerAuras[i].update();
		if (state.prayerAuras[i].done) state.prayerAuras.splice(i, 1);
	}

	for (let i = state.lanterns.length - 1; i >= 0; i--) {
		state.lanterns[i].update(frame.canvasWidth, frame.canvasHeight);
		if (state.lanterns[i].phase === 'DONE') {
			state.lanterns.splice(i, 1);
			state.engine.dirtyFlags.lanterns = true;
		}
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

	for (let i = state.lanterns.length - 1; i >= 0; i--) {
		state.lanterns[i].draw(ctx);
	}

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

function setupStartButton() {
	initDomRefs();
	setupDebugErrorOverlay();
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
