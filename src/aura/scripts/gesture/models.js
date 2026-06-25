import { FilesetResolver, HandLandmarker, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
import { THEME_COLORS } from "../constants.js";
import { state } from "../state.js";

let progressBar = null;
let loadingScreen = null;
let loadingStatus = null;

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
		const vision = await FilesetResolver.forVisionTasks(
			'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
		);

		if (progressBar) progressBar.style.width = '40%';
		if (loadingStatus) loadingStatus.innerText = 'Đang chuẩn bị nhận diện tay...';

		try {
			state.handLandmarker = await createHandLandmarker(vision, 'GPU');
		} catch (gpuErr) {
			console.warn('GPU HandLandmarker lỗi, chuyển sang CPU fallback:', gpuErr);
			state.handLandmarker = await createHandLandmarker(vision, null);
		}

		if (progressBar) progressBar.style.width = '60%';
		if (loadingStatus) loadingStatus.innerText = 'Đang chuẩn bị nhận diện khuôn mặt...';

		try {
			state.faceLandmarker = await createFaceLandmarker(vision, 'GPU');
		} catch (faceGpuErr) {
			console.warn('GPU FaceLandmarker lỗi, chuyển sang CPU fallback:', faceGpuErr);
			try {
				state.faceLandmarker = await createFaceLandmarker(vision, null);
			} catch (faceErr) {
				console.error('Không thể nạp FaceLandmarker:', faceErr);
			}
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

export function drawHandSkeleton(ctx, landmarks, isRightHand, canvasWidth, canvasHeight) {
	ctx.save();
	const theme = state.activePreset;
	const colorTheme = THEME_COLORS[theme];
	ctx.strokeStyle = isRightHand ? colorTheme.primary : colorTheme.secondary;
	ctx.lineWidth = 3;
	ctx.lineCap = 'round';
	ctx.shadowBlur = 10;
	ctx.shadowColor = ctx.strokeStyle;

	const connections = [
		[0, 1], [1, 2], [2, 3], [3, 4],
		[0, 5], [5, 6], [6, 7], [7, 8],
		[5, 9], [9, 10], [10, 11], [11, 12],
		[9, 13], [13, 14], [14, 15], [15, 16],
		[13, 17], [17, 18], [18, 19], [19, 20],
		[0, 17]
	];

	connections.forEach(([i, j]) => {
		const point1 = landmarks[i];
		const point2 = landmarks[j];
		ctx.beginPath();
		ctx.moveTo(point1.x * canvasWidth, point1.y * canvasHeight);
		ctx.lineTo(point2.x * canvasWidth, point2.y * canvasHeight);
		ctx.stroke();
	});

	ctx.fillStyle = '#ffffff';
	landmarks.forEach((point, index) => {
		ctx.beginPath();
		const size = [4, 8, 12, 16, 20].includes(index) ? 5 : 3;
		ctx.arc(point.x * canvasWidth, point.y * canvasHeight, size, 0, Math.PI * 2);
		ctx.fill();
	});
	ctx.restore();
}
