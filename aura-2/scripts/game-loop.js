function createFrameContext() {
	return {
		now: 0,
		dt: 16.67,
		frameId: 0,
		canvasWidth: 0,
		canvasHeight: 0,
		videoReady: false,
		isMirrored: false
	};
}

export function createGameLoop({ beginFrame, update, render, commit }) {
	const frame = createFrameContext();
	let rafId = 0;
	let running = false;
	let lastNow = 0;

	function tick(now) {
		if (!running) return;

		frame.now = now;
		frame.dt = Math.min(lastNow > 0 ? now - lastNow : 16.67, 50);
		frame.frameId += 1;
		lastNow = now;

		beginFrame?.(frame);
		update?.(frame);
		render?.(frame);
		commit?.(frame);

		rafId = requestAnimationFrame(tick);
	}

	return {
		start() {
			if (running) return;
			running = true;
			lastNow = performance.now();
			rafId = requestAnimationFrame(tick);
		},

		stop() {
			if (!running) return;
			running = false;
			if (rafId) cancelAnimationFrame(rafId);
			rafId = 0;
		},

		isRunning() {
			return running;
		},

		getFrame() {
			return frame;
		}
	};
}

export function shouldRunTask(frame, taskState, cadenceMs, guard = true) {
	if (!guard) return false;
	if ((frame.now - taskState.lastRunAt) < cadenceMs) return false;
	taskState.lastRunAt = frame.now;
	return true;
}