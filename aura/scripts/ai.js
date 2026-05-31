// Nạp thư viện MediaPipe qua CDN ES Module
import { FilesetResolver, HandLandmarker, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
import { state } from "./state.js";
import { THEME_COLORS } from "./constants.js";
import { triggerAuraEffects, updateAuraEffects, releaseAuraEffects } from "./canvas-effects.js";

// DOM references
let progressBar = null;
let loadingScreen = null;
let loadingStatus = null;
let statHands = null;
let statDist = null;
let gestureInstruction = null;

function initDomRefs() {
	if (!progressBar) progressBar = document.getElementById('progress-bar');
	if (!loadingScreen) loadingScreen = document.getElementById('loading-screen');
	if (!loadingStatus) loadingStatus = document.getElementById('loading-status');
	if (!statHands) statHands = document.getElementById('hands-stat');
	if (!statDist) statDist = document.getElementById('dist-stat');
	if (!gestureInstruction) gestureInstruction = document.getElementById('gesture-instruction');
}

async function createHandLandmarker(vision, delegate = "GPU") {
	const baseOptions = {
		modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
	};

	if (delegate) baseOptions.delegate = delegate;

	return HandLandmarker.createFromOptions(vision, {
		baseOptions,
		runningMode: "VIDEO",
		numHands: 2,
		// Hạ ngưỡng confidence xuống để detect tốt hơn khi 2 tay gần nhau / chồng lấp
		minHandDetectionConfidence: 0.3,
		minHandPresenceConfidence: 0.3,
		minTrackingConfidence: 0.3
	});
}

async function createFaceLandmarker(vision, delegate = "GPU") {
	const baseOptions = {
		modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
	};

	if (delegate) baseOptions.delegate = delegate;

	return FaceLandmarker.createFromOptions(vision, {
		baseOptions,
		runningMode: "VIDEO",
		outputFaceBlendshapes: false,
		outputFacialTransformationMatrixes: false
	});
}

// Tải mô hình AI từ CDN
export async function loadHandLandmarkerModel() {
	initDomRefs();
	if (loadingStatus) loadingStatus.innerText = "Đang chuẩn bị nhận diện...";
	if (progressBar) progressBar.style.width = "20%";

	try {
		const vision = await FilesetResolver.forVisionTasks(
			"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
		);

		if (progressBar) progressBar.style.width = "40%";
		if (loadingStatus) loadingStatus.innerText = "Đang chuẩn bị nhận diện tay...";

		// 1. Nạp HandLandmarker
		try {
			state.handLandmarker = await createHandLandmarker(vision, "GPU");
		} catch (gpuErr) {
			console.warn("GPU HandLandmarker lỗi, chuyển sang CPU fallback:", gpuErr);
			state.handLandmarker = await createHandLandmarker(vision, null);
		}

		if (progressBar) progressBar.style.width = "60%";
		if (loadingStatus) loadingStatus.innerText = "Đang chuẩn bị nhận diện khuôn mặt...";

		// 2. Nạp FaceLandmarker
		try {
			state.faceLandmarker = await createFaceLandmarker(vision, "GPU");
		} catch (faceGpuErr) {
			console.warn("GPU FaceLandmarker lỗi, chuyển sang CPU fallback:", faceGpuErr);
			try {
				state.faceLandmarker = await createFaceLandmarker(vision, null);
			} catch (faceErr) {
				console.error("Không thể nạp FaceLandmarker:", faceErr);
			}
		}

		if (progressBar) progressBar.style.width = "100%";
		if (loadingStatus) loadingStatus.innerText = "Sẵn sàng! Đang vào trải nghiệm...";
		console.log("Khởi tạo các mô hình MediaPipe thành công!");

		state.isModelLoaded = true;

		// Ẩn màn hình tải sau khi hoàn tất
		setTimeout(() => {
			if (loadingScreen) loadingScreen.classList.add('hidden');
		}, 800);

	} catch (err) {
		console.error("Lỗi khi tải mô hình MediaPipe:", err);
		if (loadingStatus) {
			loadingStatus.innerText = "Không thể chuẩn bị nhận diện. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.";
		}
		if (progressBar) progressBar.style.backgroundColor = "#ff4d4d";
	}
}

// Vẽ bộ khung xương tay AI bằng hiệu ứng neon
export function drawHandSkeleton(ctx, landmarks, isRightHand, canvasWidth, canvasHeight) {
	ctx.save();
	// Màu sắc khung xương đổi theo chủ đề Hào Quang đang chọn
	const theme = THEME_COLORS[state.activePreset];
	ctx.strokeStyle = isRightHand ? theme.primary : theme.secondary;
	ctx.lineWidth = 3;
	ctx.lineCap = "round";

	// Vầng phát sáng neon
	ctx.shadowBlur = 10;
	ctx.shadowColor = ctx.strokeStyle;

	// Bản đồ kết nối các khớp xương bàn tay
	const connections = [
		[0, 1], [1, 2], [2, 3], [3, 4], // Ngón cái
		[0, 5], [5, 6], [6, 7], [7, 8], // Ngón trỏ
		[5, 9], [9, 10], [10, 11], [11, 12], // Ngón giữa
		[9, 13], [13, 14], [14, 15], [15, 16], // Ngón áp út
		[13, 17], [17, 18], [18, 19], [19, 20], // Ngón út
		[0, 17] // Khớp lòng bàn tay dưới
	];

	// Vẽ các nét nối khớp xương
	connections.forEach(([i, j]) => {
		const pt1 = landmarks[i];
		const pt2 = landmarks[j];

		ctx.beginPath();
		ctx.moveTo(pt1.x * canvasWidth, pt1.y * canvasHeight);
		ctx.lineTo(pt2.x * canvasWidth, pt2.y * canvasHeight);
		ctx.stroke();
	});

	// Vẽ các hạt sáng nhỏ lấp lánh đầu khớp ngón
	ctx.fillStyle = '#ffffff';
	landmarks.forEach((pt, index) => {
		ctx.beginPath();
		const size = [4, 8, 12, 16, 20].includes(index) ? 5 : 3;
		ctx.arc(pt.x * canvasWidth, pt.y * canvasHeight, size, 0, Math.PI * 2);
		ctx.fill();
	});

	ctx.restore();
}

// === HELPER: Tính khoảng cách và thông tin giữa 2 bàn tay ===
function computeTwoHandsInfo(hand1, hand2, canvasWidth, canvasHeight) {
	const getDistance = (pt1, pt2) => {
		const dx = pt1.x - pt2.x;
		const dy = pt1.y - pt2.y;
		return Math.sqrt(dx * dx + dy * dy);
	};

	const getHandScale = (hand) => {
		const palmHeight = getDistance(hand[0], hand[9]);
		const palmWidth = getDistance(hand[5], hand[17]);
		return Math.max(palmHeight, palmWidth, 0.001);
	};

	const getPalmCenter = (hand) => {
		const anchors = [0, 5, 9, 13, 17];
		const sum = anchors.reduce((acc, index) => {
			acc.x += hand[index].x;
			acc.y += hand[index].y;
			return acc;
		}, { x: 0, y: 0 });
		return { x: sum.x / anchors.length, y: sum.y / anchors.length };
	};

	const scale = (getHandScale(hand1) + getHandScale(hand2)) / 2;
	const center1 = getPalmCenter(hand1);
	const center2 = getPalmCenter(hand2);
	const centerDist = getDistance(center1, center2);

	// Khi chắp tay, hai bàn tay thường bị MediaPipe lật hoặc mất một phần landmark.
	// Vì vậy lấy các cặp gần nhất giữa cụm lòng bàn tay thay vì so cùng index cứng.
	const palmAnchors = [0, 1, 5, 9, 13, 17];
	const nearestDistances = palmAnchors.map((index1) => {
		return Math.min(...palmAnchors.map((index2) => getDistance(hand1[index1], hand2[index2])));
	}).sort((a, b) => a - b);
	const closePalmDist = nearestDistances.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;

	// Điểm gần tay: center giữ ổn định, closePalm giúp nhận chắp tay trước khi 1 tay bị mất detect.
	const normalizedDist = scale > 0 ? ((centerDist * 0.65) + (closePalmDist * 0.35)) / scale : 999;

	// Tâm giữa 2 bàn tay (pixel)
	const midX = ((center1.x + center2.x) / 2) * canvasWidth;
	const midY = ((center1.y + center2.y) / 2) * canvasHeight;

	return { normalizedDist, midX, midY, hand1BBox: getBBox(hand1), hand2BBox: getBBox(hand2) };
}

// === HELPER: Tính % overlap bounding box 2 tay (Signal B) ===
function computeBBoxOverlapRatio(bbox1, bbox2) {
	const ix1 = Math.max(bbox1.minX, bbox2.minX);
	const iy1 = Math.max(bbox1.minY, bbox2.minY);
	const ix2 = Math.min(bbox1.maxX, bbox2.maxX);
	const iy2 = Math.min(bbox1.maxY, bbox2.maxY);

	if (ix2 <= ix1 || iy2 <= iy1) return 0;

	const interArea = (ix2 - ix1) * (iy2 - iy1);
	const area1 = (bbox1.maxX - bbox1.minX) * (bbox1.maxY - bbox1.minY);
	const area2 = (bbox2.maxX - bbox2.minX) * (bbox2.maxY - bbox2.minY);
	const minArea = Math.min(area1, area2);
	return minArea > 0 ? interArea / minArea : 0;
}

// Helper lấy bounding box của một bàn tay
function getBBox(hand) {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	hand.forEach(pt => {
		if (pt.x < minX) minX = pt.x;
		if (pt.y < minY) minY = pt.y;
		if (pt.x > maxX) maxX = pt.x;
		if (pt.y > maxY) maxY = pt.y;
	});
	return { minX, minY, maxX, maxY };
}

// === THUẬT TOÁN NHẬN DIỆN CỬ CHỄ CHẮP TAY — MULTI-SIGNAL + COOLDOWN ===
export function analyzeHands(handResults, canvasWidth, canvasHeight) {
	initDomRefs();
	const detectedCount = handResults.landmarks ? handResults.landmarks.length : 0;
	const now = performance.now();

	if (statHands) statHands.innerText = `${detectedCount}/2`;

	// ============================================================
	// TRƯỜNG HỢP: Detect đủ 2 tay → chạy multi-signal voting
	// ============================================================
	if (detectedCount >= 2) {
		const hand1 = handResults.landmarks[0];
		const hand2 = handResults.landmarks[1];

		const info = computeTwoHandsInfo(hand1, hand2, canvasWidth, canvasHeight);
		state.distanceNormalized = info.normalizedDist;
		state.lastHandsDetected = 2;
		if (statDist) statDist.innerText = info.normalizedDist.toFixed(2);

		// — Signal A: Proximity (lòng bàn tay đủ gần nhau)
		const signalA = info.normalizedDist < state.sensitivityThreshold;

		// — Signal B: Bounding Box Overlap ≥ 20%
		const overlapRatio = computeBBoxOverlapRatio(info.hand1BBox, info.hand2BBox);
		const signalB = overlapRatio >= 0.20;

		// — Signal C: Convergence (khoảng cách đang giảm nhanh)
		const delta = info.normalizedDist - state.prevNormalizedDist;
		const signalC = delta < -0.035;
		state.prevNormalizedDist = info.normalizedDist;

		const shouldActivate = signalA && (signalB || signalC);

		if (shouldActivate) {
			activateGesture(info.midX, info.midY, canvasWidth, canvasHeight);
		} else if (info.normalizedDist > (state.sensitivityThreshold + 0.15)) {
			deactivateGesture();
		}
		return;
	}

	// ============================================================
	// TRƯỜNG HỢP: Ít hơn 2 tay → deactivate ngay, không predict
	// ============================================================
	state.distanceNormalized = 999;
	state.prevNormalizedDist = 999;
	state.lastHandsDetected = detectedCount;
	if (statDist) statDist.innerText = '--';
	deactivateGesture();
}

// Kích hoạt cử chỉ chắp tay
function activateGesture(midX, midY, canvasWidth, canvasHeight) {
	const now = performance.now();
	const currentAura = state.prayerAuras[0] || null;
	const rewardPassed = (now - state.lastGestureRewardTime) > state.gestureRewardCooldownMs;

	if (!state.gestureActive) {
		state.gestureActive = true;
		triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, {
			reward: rewardPassed,
			forceNew: true
		});
		if (rewardPassed) state.lastGestureRewardTime = now;
	} else if (!currentAura || currentAura.done) {
		triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, {
			reward: false,
			forceNew: true
		});
	} else {
		updateAuraEffects(midX, midY, canvasWidth, canvasHeight);
	}
}

// Tắt cử chỉ chắp tay
function deactivateGesture() {
	if (state.gestureActive) {
		state.gestureActive = false;
		releaseAuraEffects();
		if (gestureInstruction) gestureInstruction.classList.remove('hidden');
	}
}
