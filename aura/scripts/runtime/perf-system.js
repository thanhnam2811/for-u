import { state } from "../state.js";

const FPS_SAMPLE_WINDOW_MS = 1000;

function nextFogQuality(current, averageFps) {
	if (current === 'high') {
		if (averageFps < 42) return 'medium';
		return current;
	}

	if (current === 'medium') {
		if (averageFps < 30) return 'low';
		if (averageFps > 54) return 'high';
		return current;
	}

	if (averageFps > 38) return 'medium';
	return current;
}

export function updatePerformanceState(frame, statFpsEl) {
	state.frameCount++;
	if (frame.now <= state.lastFrameTime + FPS_SAMPLE_WINDOW_MS) return;

	state.currentFps = Math.round((state.frameCount * 1000) / (frame.now - state.lastFrameTime));
	state.frameCount = 0;
	state.lastFrameTime = frame.now;

	const perf = state.engine.performance;
	perf.averageFps = perf.averageFps * 0.72 + state.currentFps * 0.28;
	perf.fogQuality = nextFogQuality(perf.fogQuality, perf.averageFps);
	perf.effectQuality = perf.fogQuality;

	if (statFpsEl) {
		const qualitySuffix = perf.fogQuality === 'high' ? '' : ` ${perf.fogQuality[0].toUpperCase()}`;
		statFpsEl.innerText = `${state.currentFps}${qualitySuffix}`;
	}
}