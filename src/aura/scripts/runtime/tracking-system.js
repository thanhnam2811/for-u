import { state } from "../state.js";
import { analyzeHands } from "../gesture/prayer-detection.js";
import { ensureFaceLandmarker } from "../gesture/models.js";
import { shouldRunTask } from "../game-loop.js";

const HAND_INTERVAL_BY_QUALITY = {
	high: 33,
	medium: 40,
	low: 50
};

const FACE_INTERVAL_BY_QUALITY = {
	high: 66,
	medium: 90,
	low: 120
};

function getQualityTier() {
	return state.engine.performance.fogQuality || "high";
}

export function updateTracking(frame, video) {
	if (!state.isModelLoaded || !video) return;

	const timestamp = frame.now;
	const handTask = state.engine.tasks.handDetect;
	const faceTask = state.engine.tasks.faceDetect;
	const quality = getQualityTier();
	const handCadence = HAND_INTERVAL_BY_QUALITY[quality] || HAND_INTERVAL_BY_QUALITY.high;
	const faceCadence = FACE_INTERVAL_BY_QUALITY[quality] || FACE_INTERVAL_BY_QUALITY.high;

	const hasNewHandVideoFrame = video.currentTime !== handTask.lastVideoTime;
	if (state.handLandmarker && shouldRunTask(frame, handTask, handCadence, hasNewHandVideoFrame)) {
		handTask.lastVideoTime = video.currentTime;
		try {
			const results = state.handLandmarker.detectForVideo(video, timestamp);
			state.handResults = analyzeHands(results, frame.canvasWidth, frame.canvasHeight) || results;
		} catch (err) {
			console.error("[AuraApp] Lỗi nhận diện tay:", err);
		}
	}

	if (state.activeFaceFilter !== 'none' && !state.faceLandmarker) {
		// Model face được tải lazy — chỉ khi user bật filter AR
		void ensureFaceLandmarker();
	}

	if (state.activeFaceFilter !== 'none' && state.faceLandmarker) {
		const hasNewFaceVideoFrame = video.currentTime !== faceTask.lastVideoTime;
		if (shouldRunTask(frame, faceTask, faceCadence, hasNewFaceVideoFrame)) {
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