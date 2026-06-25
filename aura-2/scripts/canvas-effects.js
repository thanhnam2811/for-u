import { state } from "./state.js";
import { playZenSound } from "./audio.js";
import { rewardPhuoc } from "./effects/phuoc-feedback.js";
import { PrayerAuraAnimation } from "./effects/prayer-aura.js";

export { Particle, Ripple, AuraBurst, BodyGlowPulse, AuraLineWave, hexToRgb } from "./effects/core-effects.js";
export { PrayerAuraAnimation } from "./effects/prayer-aura.js";

export function triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, options = {}) {
	const { reward = true, forceNew = false } = options;
	const effectX = state.mirrorCamera ? canvasWidth - midX : midX;
	const currentAura = state.prayerAuras[0] || null;

	if (!forceNew && currentAura && !currentAura.done) {
		currentAura.setCenter(effectX, midY, canvasWidth, canvasHeight);
		return currentAura;
	}

	state.prayerAuras.length = 0;
	const aura = new PrayerAuraAnimation(effectX, midY, state.activePreset, canvasWidth, canvasHeight);
	state.prayerAuras.push(aura);

	if (!reward) return aura;

	playZenSound();
	if (typeof state._onGestureTriggered === 'function') {
		state._onGestureTriggered(effectX, midY);
	}
	rewardPhuoc(effectX, midY);
	return aura;
}

export function updateAuraEffects() {
	const currentAura = state.prayerAuras[0] || null;
	if (!currentAura || currentAura.done) return null;
	return currentAura;
}

export function releaseAuraEffects() {
	return;
}
