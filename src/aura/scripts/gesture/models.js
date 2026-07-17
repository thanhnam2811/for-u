import { FilesetResolver, HandLandmarker, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
import { THEME_COLORS } from "../constants.js";
import { state } from "../state.js";

let progressBar = null;
let loadingScreen = null;
let loadingStatus = null;
let visionFileset = null;
let faceLandmarkerPromise = null;

function initDomRefs() {
	if (!progressBar) progressBar = document.getElementById('progress-bar');
	if (!loadingScreen) loadingScreen = document.getElementById('loading-screen');
	if (!loadingStatus) loadingStatus = document.getElementById('loading-status');
}

async function createHandLandmarker(vision, delegate = 'GPU') {
	const baseOptions = {
		modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
	};

	if (delegate) baseOptions.delegate = delegate;

	return HandLandmarker.createFromOptions(vision, {
		baseOptions,
		runningMode: 'VIDEO',
		numHands: 2,
		minHandDetectionConfidence: 0.42,
		minHandPresenceConfidence: 0.42,
		minTrackingConfidence: 0.4
	});
}

async function createFaceLandmarker(vision, delegate = 'GPU') {
	const baseOptions = {
		modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
	};

	if (delegate) baseOptions.delegate = delegate;

	return FaceLandmarker.createFromOptions(vision, {
		baseOptions,
		runningMode: 'VIDEO',
		outputFaceBlendshapes: false,
		outputFacialTransformationMatrixes: false
	});
}

export async function loadHandLandmarkerModel() {
	initDomRefs();
	if (loadingStatus) loadingStatus.innerText = 'Đang chuẩn bị nhận diện...';
	if (progressBar) progressBar.style.width = '20%';

	try {
		visionFileset = await FilesetResolver.forVisionTasks(
			'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
		);

		if (progressBar) progressBar.style.width = '40%';
		if (loadingStatus) loadingStatus.innerText = 'Đang chuẩn bị nhận diện tay...';

		try {
			state.handLandmarker = await createHandLandmarker(visionFileset, 'GPU');
		} catch (gpuErr) {
			console.warn('GPU HandLandmarker lỗi, chuyển sang CPU fallback:', gpuErr);
			state.handLandmarker = await createHandLandmarker(visionFileset, null);
		}

		// FaceLandmarker chỉ cần cho filter AR khuôn mặt (hiện đang tắt)
		// → tải lazy qua ensureFaceLandmarker() khi filter được bật, tiết kiệm ~3MB model lúc khởi động
		if (state.activeFaceFilter !== 'none') {
			void ensureFaceLandmarker();
		}

		if (progressBar) progressBar.style.width = '100%';
		if (loadingStatus) loadingStatus.innerText = 'Sẵn sàng! Đang vào trải nghiệm...';
		state.isModelLoaded = true;

		setTimeout(() => {
			if (loadingScreen) loadingScreen.classList.add('hidden');
		}, 800);
	} catch (err) {
		console.error('Lỗi khi tải mô hình MediaPipe:', err);
		if (loadingStatus) {
			loadingStatus.innerText = 'Không thể chuẩn bị nhận diện. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.';
		}
		if (progressBar) progressBar.style.backgroundColor = '#ff4d4d';
	}
}

// Tải FaceLandmarker theo yêu cầu (chỉ khi filter AR khuôn mặt được bật)
export function ensureFaceLandmarker() {
	if (state.faceLandmarker) return Promise.resolve(state.faceLandmarker);
	if (faceLandmarkerPromise) return faceLandmarkerPromise;
	if (!visionFileset) return Promise.resolve(null);

	faceLandmarkerPromise = (async () => {
		try {
			state.faceLandmarker = await createFaceLandmarker(visionFileset, 'GPU');
		} catch (faceGpuErr) {
			console.warn('GPU FaceLandmarker lỗi, chuyển sang CPU fallback:', faceGpuErr);
			try {
				state.faceLandmarker = await createFaceLandmarker(visionFileset, null);
			} catch (faceErr) {
				console.error('Không thể nạp FaceLandmarker:', faceErr);
			}
		}
		return state.faceLandmarker;
	})();

	return faceLandmarkerPromise;
}

const HAND_CONNECTIONS = [
	[0, 1], [1, 2], [2, 3], [3, 4],
	[0, 5], [5, 6], [6, 7], [7, 8],
	[5, 9], [9, 10], [10, 11], [11, 12],
	[9, 13], [13, 14], [14, 15], [15, 16],
	[13, 17], [17, 18], [18, 19], [19, 20],
	[0, 17]
];

const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20]);

export function drawHandSkeleton(ctx, landmarks, isRightHand, canvasWidth, canvasHeight) {
	ctx.save();
	const theme = state.activePreset;
	const colorTheme = THEME_COLORS[theme];
	ctx.strokeStyle = isRightHand ? colorTheme.primary : colorTheme.secondary;
	ctx.lineWidth = 3;
	ctx.lineCap = 'round';
	ctx.shadowBlur = 10;
	ctx.shadowColor = ctx.strokeStyle;

	// Gom toàn bộ 21 đoạn xương vào một path duy nhất — stroke có shadowBlur rất đắt,
	// stroke 1 lần thay vì 21 lần mỗi tay mỗi frame
	ctx.beginPath();
	for (const [i, j] of HAND_CONNECTIONS) {
		const point1 = landmarks[i];
		const point2 = landmarks[j];
		ctx.moveTo(point1.x * canvasWidth, point1.y * canvasHeight);
		ctx.lineTo(point2.x * canvasWidth, point2.y * canvasHeight);
	}
	ctx.stroke();

	// Gom các khớp tay vào một path fill duy nhất (giữ shadowBlur để khớp vẫn có glow như cũ)
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	landmarks.forEach((point, index) => {
		const x = point.x * canvasWidth;
		const y = point.y * canvasHeight;
		const size = FINGERTIP_INDICES.has(index) ? 5 : 3;
		ctx.moveTo(x + size, y);
		ctx.arc(x, y, size, 0, Math.PI * 2);
	});
	ctx.fill();
	ctx.restore();
}
