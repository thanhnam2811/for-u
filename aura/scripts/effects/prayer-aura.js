import { state } from "../state.js";
import { THEME_COLORS } from "../constants.js";
import { hexToRgb } from "./core-effects.js";

function clamp01(value) {
	return Math.min(1, Math.max(0, value));
}

function lerp(start, end, amount) {
	return start + (end - start) * amount;
}

function smoothstep(edge0, edge1, value) {
	const t = clamp01((value - edge0) / (edge1 - edge0 || 1));
	return t * t * (3 - 2 * t);
}

let auraCanvas = null;
let auraCtx = null;

function ensureAuraCanvas(width, height) {
	if (!auraCanvas) {
		auraCanvas = document.createElement('canvas');
		auraCtx = auraCanvas.getContext('2d');
	}

	if (auraCanvas.width !== width || auraCanvas.height !== height) {
		auraCanvas.width = width;
		auraCanvas.height = height;
	}

	return auraCtx;
}

export class PrayerAuraAnimation {
	constructor(centerX, centerY, theme, canvasWidth, canvasHeight) {
		this.centerX = centerX;
		this.centerY = centerY;
		this.themeColors = THEME_COLORS[theme];
		this.primaryRgb = hexToRgb(this.themeColors.primary);
		this.secondaryRgb = hexToRgb(this.themeColors.secondary);
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.life = 0;
		this.clearRadius = 0;
		this.maxRadius = Math.hypot(
			Math.max(centerX, canvasWidth - centerX),
			Math.max(centerY, canvasHeight - centerY)
		);
		this.baseClearSpeed = Math.max(18, Math.min(canvasWidth, canvasHeight) * 0.023);
		this.velocity = this.baseClearSpeed * 0.72;
		this.done = false;
	}

	update() {
		this.life += 1;
		const progress = clamp01(this.clearRadius / (this.maxRadius || 1));
		const targetSpeed = lerp(this.baseClearSpeed * 1.06, this.baseClearSpeed * 0.62, smoothstep(0, 1, progress));
		this.velocity = lerp(this.velocity, targetSpeed, 0.14);
		this.clearRadius += this.velocity;
		state.auraWaveCenterX = this.centerX;
		state.auraWaveCenterY = this.centerY;
		state.auraWaveRadius = this.clearRadius;
		state.auraWaveActive = true;

		if (this.clearRadius >= this.maxRadius * 0.9) {
			state.auraWaveActive = false;
			this.done = true;
		}
	}

	setCenter(centerX, centerY, canvasWidth, canvasHeight) {
		this.centerX = centerX;
		this.centerY = centerY;
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.maxRadius = Math.hypot(
			Math.max(centerX, canvasWidth - centerX),
			Math.max(centerY, canvasHeight - centerY)
		);
	}

	draw(ctx) {
		if (this.done) return;
		const layerCtx = ensureAuraCanvas(this.canvasWidth, this.canvasHeight);
		if (!layerCtx) return;

		const progress = clamp01(this.clearRadius / (this.maxRadius || 1));
		const flashAlpha = (1 - smoothstep(0.15, 1, progress)) * 0.88;
		const washAlpha = (1 - smoothstep(0.30, 1, progress)) * 0.42;
		const centerAlpha = (1 - smoothstep(0.05, 0.72, progress)) * 0.95;
		const ringSoftness = lerp(1.05, 1.22, progress);
		const edgeAlpha = (1 - smoothstep(0.18, 0.96, progress)) * 0.26;

		layerCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		const backdropWash = layerCtx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
		backdropWash.addColorStop(0, `rgba(${this.secondaryRgb}, ${washAlpha * 0.36})`);
		backdropWash.addColorStop(0.5, `rgba(255, 255, 255, ${washAlpha * 0.18})`);
		backdropWash.addColorStop(1, `rgba(${this.primaryRgb}, ${washAlpha * 0.34})`);
		layerCtx.fillStyle = backdropWash;
		layerCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

		const screenGlow = layerCtx.createRadialGradient(
			this.canvasWidth * 0.5,
			this.canvasHeight * 0.5,
			Math.min(this.canvasWidth, this.canvasHeight) * 0.08,
			this.canvasWidth * 0.5,
			this.canvasHeight * 0.5,
			Math.hypot(this.canvasWidth, this.canvasHeight) * 0.68
		);
		screenGlow.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha * 0.92})`);
		screenGlow.addColorStop(0.22, `rgba(${this.secondaryRgb}, ${flashAlpha * 0.50})`);
		screenGlow.addColorStop(0.58, `rgba(${this.primaryRgb}, ${flashAlpha * 0.32})`);
		screenGlow.addColorStop(1, `rgba(${this.primaryRgb}, 0)`);

		layerCtx.fillStyle = screenGlow;
		layerCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

		const centerGlow = layerCtx.createRadialGradient(
			this.centerX,
			this.centerY,
			0,
			this.centerX,
			this.centerY,
			this.clearRadius * ringSoftness
		);
		centerGlow.addColorStop(0, `rgba(255, 255, 255, ${centerAlpha})`);
		centerGlow.addColorStop(0.35, `rgba(${this.secondaryRgb}, ${centerAlpha * 0.55})`);
		centerGlow.addColorStop(1, `rgba(${this.primaryRgb}, 0)`);
		layerCtx.fillStyle = centerGlow;
		layerCtx.beginPath();
		layerCtx.arc(this.centerX, this.centerY, this.clearRadius * ringSoftness, 0, Math.PI * 2);
		layerCtx.fill();

		const residueGlow = layerCtx.createRadialGradient(
			this.centerX,
			this.centerY,
			this.clearRadius * 0.82,
			this.centerX,
			this.centerY,
			this.clearRadius * 1.24
		);
		residueGlow.addColorStop(0, 'rgba(255, 255, 255, 0)');
		residueGlow.addColorStop(0.62, `rgba(${this.secondaryRgb}, ${edgeAlpha * 0.38})`);
		residueGlow.addColorStop(0.8, `rgba(255, 255, 255, ${edgeAlpha})`);
		residueGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
		layerCtx.fillStyle = residueGlow;
		layerCtx.beginPath();
		layerCtx.arc(this.centerX, this.centerY, this.clearRadius * 1.24, 0, Math.PI * 2);
		layerCtx.fill();

		layerCtx.save();
		layerCtx.globalCompositeOperation = 'destination-out';
		const clearGrad = layerCtx.createRadialGradient(
			this.centerX,
			this.centerY,
			0,
			this.centerX,
			this.centerY,
			this.clearRadius
		);
		clearGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
		clearGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.9)');
		clearGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.4)');
		clearGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		layerCtx.fillStyle = clearGrad;
		layerCtx.beginPath();
		layerCtx.arc(this.centerX, this.centerY, this.clearRadius, 0, Math.PI * 2);
		layerCtx.fill();
		layerCtx.restore();

		ctx.save();
		ctx.globalCompositeOperation = 'screen';
		ctx.drawImage(auraCanvas, 0, 0);
		ctx.restore();
	}
}
