import { state } from "../state.js";

export function updateLanterns(frame) {
	const quality = state.engine.performance.effectQuality || 'high';
	const wallClockNow = Date.now();

	for (let i = state.lanterns.length - 1; i >= 0; i--) {
		state.lanterns[i].update(wallClockNow, frame.canvasWidth, frame.canvasHeight, quality);
		if (state.lanterns[i].phase === 'DONE') {
			state.lanterns.splice(i, 1);
			state.engine.dirtyFlags.lanterns = true;
		}
	}
}

export function renderLanterns(ctx, frame) {
	const quality = state.engine.performance.effectQuality || 'high';
	const totalLanterns = state.lanterns.length;

	for (let i = totalLanterns - 1; i >= 0; i--) {
		state.lanterns[i].draw(ctx, frame.now, quality);
	}
}