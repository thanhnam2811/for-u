import { state } from "../state.js";
import { triggerAuraEffects, updateAuraEffects, releaseAuraEffects } from "../canvas-effects.js";

const DETECTION_CONFIDENCE_GATE = 0.45;
const STABLE_TWO_HAND_FRAMES = 3;
const ACTIVATION_FRAMES = 2;
const RELEASE_MISS_FRAMES = 3;
const DISTANCE_EMA_ALPHA = 0.4;
const OVERLAP_THRESHOLD = 0.24;
const CONVERGENCE_WINDOW = 6;
const CONVERGENCE_DROP = 0.045;

let statHands = null;
let statDist = null;
let gestureInstruction = null;
let recentDistances = [];

function initDomRefs() {
	if (!statHands) statHands = document.getElementById('hands-stat');
	if (!statDist) statDist = document.getElementById('dist-stat');
	if (!gestureInstruction) gestureInstruction = document.getElementById('gesture-instruction');
}

function getHandMeta(handResults, index) {
	const handedness = handResults.handednesses?.[index]?.[0];
	return {
		label: handedness?.categoryName || 'Unknown',
		score: handedness?.score || 0
	};
}

function getDistance(point1, point2) {
	const dx = point1.x - point2.x;
	const dy = point1.y - point2.y;
	return Math.sqrt(dx * dx + dy * dy);
}

function getHandScale(hand) {
	const palmHeight = getDistance(hand[0], hand[9]);
	const palmWidth = getDistance(hand[5], hand[17]);
	return Math.max(palmHeight, palmWidth, 0.001);
}

function getPalmCenter(hand) {
	const anchors = [0, 5, 9, 13, 17];
	const sum = anchors.reduce((acc, index) => {
		acc.x += hand[index].x;
		acc.y += hand[index].y;
		return acc;
	}, { x: 0, y: 0 });
	return { x: sum.x / anchors.length, y: sum.y / anchors.length };
}

function getBBox(hand) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const point of hand) {
		if (point.x < minX) minX = point.x;
		if (point.y < minY) minY = point.y;
		if (point.x > maxX) maxX = point.x;
		if (point.y > maxY) maxY = point.y;
	}
	return { minX, minY, maxX, maxY };
}

function computeTwoHandsInfo(hand1, hand2, canvasWidth, canvasHeight) {
	const scale = (getHandScale(hand1) + getHandScale(hand2)) / 2;
	const center1 = getPalmCenter(hand1);
	const center2 = getPalmCenter(hand2);
	const centerDist = getDistance(center1, center2);
	const palmAnchors = [0, 1, 5, 9, 13, 17];
	const nearestDistances = palmAnchors
		.map((index1) => Math.min(...palmAnchors.map((index2) => getDistance(hand1[index1], hand2[index2]))))
		.sort((a, b) => a - b);
	const closePalmDist = nearestDistances.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;
	const normalizedDist = scale > 0 ? ((centerDist * 0.65) + (closePalmDist * 0.35)) / scale : 999;
	const midX = ((center1.x + center2.x) / 2) * canvasWidth;
	const midY = ((center1.y + center2.y) / 2) * canvasHeight;

	return {
		normalizedDist,
		midX,
		midY,
		hand1BBox: getBBox(hand1),
		hand2BBox: getBBox(hand2)
	};
}

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

function countExtendedFingers(hand) {
	const fingers = [
		[8, 6, 5],
		[12, 10, 9],
		[16, 14, 13],
		[20, 18, 17]
	];

	return fingers.reduce((count, [tip, pip, mcp]) => {
		return hand[tip].y < hand[pip].y && hand[pip].y < hand[mcp].y ? count + 1 : count;
	}, 0);
}

function isHandUpright(hand) {
	return hand[0].y > hand[9].y && hand[9].y > hand[12].y;
}

function isPrayerHandShape(hand1, hand2) {
	const center1 = getPalmCenter(hand1);
	const center2 = getPalmCenter(hand2);
	const avgScale = (getHandScale(hand1) + getHandScale(hand2)) * 0.5;
	const verticalAlignment = Math.abs(center1.y - center2.y) <= avgScale * 0.8;

	return (
		countExtendedFingers(hand1) >= 2 &&
		countExtendedFingers(hand2) >= 2 &&
		isHandUpright(hand1) &&
		isHandUpright(hand2) &&
		verticalAlignment
	);
}

function hasValidHandPair(handResults) {
	const hand1Meta = getHandMeta(handResults, 0);
	const hand2Meta = getHandMeta(handResults, 1);
	const confidentPair = hand1Meta.score >= DETECTION_CONFIDENCE_GATE && hand2Meta.score >= DETECTION_CONFIDENCE_GATE;
	const distinctHands = hand1Meta.label !== hand2Meta.label && hand1Meta.label !== 'Unknown' && hand2Meta.label !== 'Unknown';
	return confidentPair && distinctHands;
}

function updateSmoothedDistance(rawDistance) {
	if (state.smoothedDistanceNormalized >= 999) {
		state.smoothedDistanceNormalized = rawDistance;
	} else {
		state.smoothedDistanceNormalized =
			state.smoothedDistanceNormalized * (1 - DISTANCE_EMA_ALPHA) +
			rawDistance * DISTANCE_EMA_ALPHA;
	}

	recentDistances.push(state.smoothedDistanceNormalized);
	if (recentDistances.length > CONVERGENCE_WINDOW) {
		recentDistances.shift();
	}

	return state.smoothedDistanceNormalized;
}

function hasConvergenceSignal(currentDistance) {
	if (recentDistances.length < CONVERGENCE_WINDOW) return false;
	return (recentDistances[0] - currentDistance) > CONVERGENCE_DROP;
}

function resetGestureTracking() {
	state.distanceNormalized = 999;
	state.smoothedDistanceNormalized = 999;
	state.prevNormalizedDist = 999;
	state.stableTwoHandFrames = 0;
	state.prayerCandidateFrames = 0;
	recentDistances = [];
}

export function analyzeHands(handResults, canvasWidth, canvasHeight) {
	initDomRefs();
	const detectedCount = handResults.landmarks ? handResults.landmarks.length : 0;
	const now = performance.now();
	if (statHands) statHands.innerText = `${detectedCount}/2`;

	if (detectedCount >= 2) {
		const hand1 = handResults.landmarks[0];
		const hand2 = handResults.landmarks[1];
		const validPair = hasValidHandPair(handResults);
		const shapeValid = validPair && isPrayerHandShape(hand1, hand2);

		if (!shapeValid) {
			state.stableTwoHandFrames = 0;
			state.prayerCandidateFrames = 0;
			state.gestureMissFrames++;
			if (state.gestureMissFrames >= RELEASE_MISS_FRAMES) {
				deactivateGesture();
			}
			if (statDist) statDist.innerText = '--';
			return;
		}

		state.gestureMissFrames = 0;
		state.stableTwoHandFrames++;
		const info = computeTwoHandsInfo(hand1, hand2, canvasWidth, canvasHeight);
		state.distanceNormalized = info.normalizedDist;
		const smoothedDistance = updateSmoothedDistance(info.normalizedDist);
		state.lastHandsDetected = 2;
		if (statDist) statDist.innerText = smoothedDistance.toFixed(2);

		const signalA = smoothedDistance < state.sensitivityThreshold;
		const overlapRatio = computeBBoxOverlapRatio(info.hand1BBox, info.hand2BBox);
		const signalB = overlapRatio >= OVERLAP_THRESHOLD;
		const signalC = hasConvergenceSignal(smoothedDistance);
		state.prevNormalizedDist = smoothedDistance;

		const shouldActivate = state.stableTwoHandFrames >= STABLE_TWO_HAND_FRAMES && signalA && (signalB || signalC);
		state.prayerCandidateFrames = shouldActivate ? state.prayerCandidateFrames + 1 : 0;
		if (shouldActivate) {
			if (state.prayerCandidateFrames >= ACTIVATION_FRAMES) {
				activateGesture(info.midX, info.midY, canvasWidth, canvasHeight, now);
			}
		} else if (smoothedDistance > (state.sensitivityThreshold + 0.18)) {
			state.gestureMissFrames++;
			if (state.gestureMissFrames >= RELEASE_MISS_FRAMES) {
				deactivateGesture();
			}
		} else {
			state.gestureMissFrames = 0;
			if (state.gestureActive) {
				updateAuraEffects(info.midX, info.midY, canvasWidth, canvasHeight);
			}
		}

		if (state.gestureActive && state.gestureMissFrames === 0 && state.prayerCandidateFrames === 0) {
			updateAuraEffects(info.midX, info.midY, canvasWidth, canvasHeight);
		}

		if (!state.gestureActive && state.prayerCandidateFrames === 0 && smoothedDistance > (state.sensitivityThreshold + 0.25)) {
			deactivateGesture();
		}
		return;
	}

	state.gestureMissFrames++;
	resetGestureTracking();
	state.lastHandsDetected = detectedCount;
	if (statDist) statDist.innerText = '--';
	if (state.gestureMissFrames >= RELEASE_MISS_FRAMES) {
		deactivateGesture();
	}
}

function activateGesture(midX, midY, canvasWidth, canvasHeight, now) {
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

function deactivateGesture() {
	if (!state.gestureActive) return;
	state.gestureActive = false;
	releaseAuraEffects();
	if (gestureInstruction) gestureInstruction.classList.remove('hidden');
}
