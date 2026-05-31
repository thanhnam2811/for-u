import { state, incrementPhuoc } from "./state.js";
import { THEME_COLORS } from "./constants.js";
import { playZenSound } from "./audio.js";

// ─────────────────────────────────────────────────────────────────────────────
// DOM references
// ─────────────────────────────────────────────────────────────────────────────
let phuocDisplay = null;
let phuocBadge = null;

function initDomRefs() {
	if (!phuocDisplay) phuocDisplay = document.getElementById('phuoc-count-display');
	if (!phuocBadge) phuocBadge = document.getElementById('phuoc-badge');
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle — hạt sáng lấp lánh
// ─────────────────────────────────────────────────────────────────────────────
export class Particle {
	constructor(x, y, theme, canvasWidth, canvasHeight) {
		this.x = x;
		this.y = y;
		const angle = Math.random() * Math.PI * 2;
		const speed = 1.5 + Math.random() * 8.5;
		this.vx = Math.cos(angle) * speed;
		this.vy = Math.sin(angle) * speed - 1.5;
		this.size = 2 + Math.random() * 8;
		this.colorList = THEME_COLORS[theme].sparkles;
		this.color = this.colorList[Math.floor(Math.random() * this.colorList.length)];
		this.alpha = 1.0;
		this.maxLife = 35 + Math.random() * 45;
		this.life = this.maxLife;
	}

	update() {
		this.x += this.vx;
		this.y += this.vy;
		this.vx *= 0.96;
		this.vy *= 0.96;
		this.life--;
		this.alpha = this.life / this.maxLife;
		this.size *= 0.97;
	}

	draw(ctx) {
		ctx.save();
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.color;
		ctx.shadowBlur = this.size * 1.5;
		ctx.shadowColor = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Ripple — sóng vòng lan tỏa (fallback khi không có outline)
// ─────────────────────────────────────────────────────────────────────────────
export class Ripple {
	constructor(x, y, theme, canvasWidth, canvasHeight) {
		this.x = x;
		this.y = y;
		this.radius = 10;
		this.maxRadius = Math.max(canvasWidth, canvasHeight) * 1.2;
		this.themeColors = THEME_COLORS[theme];
		this.color = this.themeColors.primary;
		this.alpha = 1.0;
		this.speed = 18 + Math.random() * 6;
	}

	update() {
		this.radius += this.speed;
		this.alpha = 1 - (this.radius / this.maxRadius);
		this.speed *= 0.97;
	}

	draw(ctx) {
		ctx.save();
		ctx.globalAlpha = this.alpha;
		ctx.strokeStyle = this.color;
		ctx.lineWidth = 1 + 8 * (1 - this.radius / this.maxRadius);
		ctx.shadowBlur = 20;
		ctx.shadowColor = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AuraBurst — vầng bùng nổ phủ ngập full canvas ngay lập tức
// ─────────────────────────────────────────────────────────────────────────────
export class AuraBurst {
	constructor(centerX, centerY, theme, canvasWidth, canvasHeight) {
		this.centerX = centerX;
		this.centerY = centerY;
		this.themeColors = THEME_COLORS[theme];
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.maxRadius = Math.hypot(canvasWidth, canvasHeight);
		this.maxLife = 40;
		this.life = this.maxLife;
		this.done = false;
	}

	update() {
		this.life--;
		if (this.life <= 0) this.done = true;
	}

	draw(ctx) {
		if (this.done) return;
		const t = this.life / this.maxLife;
		// Ease-out fade: sáng mạnh đầu, mờ nhanh cuối
		const alpha = 0.80 * Math.pow(t, 0.55);
		const { primary, secondary } = this.themeColors;
		const pRgb = hexToRgb(primary);
		const sRgb = hexToRgb(secondary);

		ctx.save();
		ctx.globalCompositeOperation = 'screen';
		ctx.globalAlpha = alpha;

		const grad = ctx.createRadialGradient(
			this.centerX, this.centerY, 0,
			this.centerX, this.centerY, this.maxRadius
		);
		grad.addColorStop(0.00, '#ffffff');
		grad.addColorStop(0.07, `rgba(${pRgb}, 1)`);
		grad.addColorStop(0.25, `rgba(${sRgb}, 0.85)`);
		grad.addColorStop(0.60, `rgba(${pRgb}, 0.3)`);
		grad.addColorStop(1.00, `rgba(${pRgb}, 0)`);

		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
		ctx.restore();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BodyGlowPulse — hào quang phát sáng từ đường viền cơ thể
// ─────────────────────────────────────────────────────────────────────────────
export class BodyGlowPulse {
	/**
	 * @param {Array<{x:number, y:number}>} points - outline points (pixel coords)
	 * @param {string} theme
	 * @param {number} canvasWidth
	 * @param {number} canvasHeight
	 * @param {number} delay - frames to wait before starting
	 */
	constructor(points, theme, canvasWidth, canvasHeight, delay = 0) {
		this.points = points.map(p => ({ x: p.x, y: p.y }));
		this.themeColors = THEME_COLORS[theme];
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.delay = delay;
		this.maxLife = 50;
		this.life = this.maxLife;
		this.done = false;
	}

	update() {
		if (this.delay > 0) { this.delay--; return; }
		this.life--;
		if (this.life <= 0) this.done = true;
	}

	draw(ctx) {
		if (this.delay > 0 || this.done || this.points.length < 5) return;

		const t = this.life / this.maxLife;
		const progress = 1 - t;
		// Sáng nhanh rồi mờ dần
		const alpha = Math.sin(Math.PI * t) * 0.9;
		// Glow lan rộng ra theo progress
		const blurSize = 15 + progress * 80;
		const lineWidth = 2 + (1 - progress) * 12;

		const { primary } = this.themeColors;
		const pRgb = hexToRgb(primary);

		ctx.save();
		ctx.globalCompositeOperation = 'screen';
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = `rgba(${pRgb}, 1)`;
		ctx.lineWidth = lineWidth;
		ctx.shadowBlur = blurSize;
		ctx.shadowColor = primary;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.beginPath();
		this.points.forEach((pt, i) => {
			if (i === 0) ctx.moveTo(pt.x, pt.y);
			else ctx.lineTo(pt.x, pt.y);
		});
		ctx.closePath();
		ctx.stroke();

		// Lớp 2: vẽ thêm stroke mỏng hơn với shadow blur lớn hơn để tạo hiệu ứng hào quang lan ra xa
		ctx.lineWidth = 1;
		ctx.shadowBlur = blurSize * 2.5;
		ctx.stroke();

		ctx.restore();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AuraLineWave — sóng năng lượng bao quanh silhouette người
// ─────────────────────────────────────────────────────────────────────────────
export class AuraLineWave {
	constructor(points, theme, canvasWidth, canvasHeight, delay = 0) {
		this.points = points.map(p => ({ x: p.x, y: p.y }));
		this.themeColors = THEME_COLORS[theme];
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.life = 0;
		this.maxLife = 60;
		this.delay = delay;
		this.done = false;

		const center = this.points.reduce(
			(acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 }
		);
		this.center = { x: center.x / this.points.length, y: center.y / this.points.length };
		this.avgRadius = this.points.reduce(
			(acc, p) => acc + Math.hypot(p.x - this.center.x, p.y - this.center.y), 0
		) / this.points.length;
	}

	update() {
		if (this.delay > 0) { this.delay--; return; }
		this.life++;
		if (this.life >= this.maxLife) this.done = true;
	}

	draw(ctx) {
		if (this.delay > 0 || this.done || this.points.length < 5) return;

		const progress = this.life / this.maxLife;

		// Tỏa cực nhanh, chậm dần về sát màn hình (Quintic ease-out)
		const t = 1 - Math.pow(1 - progress, 5);

		// Morph từ silhouette sang hình tròn (xảy ra rất trễ, gần mép màn)
		const morphToCircle = Math.pow(progress, 3.5);

		// Bán kính để vầng hào quang vượt ra khỏi màn hình
		const targetDist = Math.max(this.canvasWidth, this.canvasHeight) * 1.25;

		// Alpha: sáng mạnh ở đầu, mờ từ từ
		const brightnessAlpha = Math.sin(Math.PI * Math.pow(progress, 0.5));
		const finalAlpha = brightnessAlpha * (1 - progress * 0.7);

		ctx.save();
		ctx.globalAlpha = finalAlpha;
		ctx.globalCompositeOperation = 'screen';
		ctx.strokeStyle = this.themeColors.primary;
		ctx.lineWidth = 1 + (1 - progress) * 6;
		ctx.shadowBlur = 25 * brightnessAlpha;
		ctx.shadowColor = this.themeColors.primary;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctx.beginPath();
		this.points.forEach((pt, i) => {
			const dx = pt.x - this.center.x;
			const dy = pt.y - this.center.y;
			const dist = Math.hypot(dx, dy);
			const ux = dx / (dist || 1);
			const uy = dy / (dist || 1);

			const currentRadius = dist * (1 - morphToCircle) + this.avgRadius * morphToCircle;
			const drawRadius = currentRadius + (targetDist * t);

			const rx = this.center.x + ux * drawRadius;
			const ry = this.center.y + uy * drawRadius;

			if (i === 0) ctx.moveTo(rx, ry);
			else ctx.lineTo(rx, ry);
		});
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
	}
}

function clamp01(value) {
	return Math.min(1, Math.max(0, value));
}

function lerp(start, end, amount) {
	return start + (end - start) * amount;
}

function easeOutCubic(value) {
	const t = clamp01(value);
	return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(value) {
	const t = clamp01(value);
	return -(Math.cos(Math.PI * t) - 1) / 2;
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
		this.clearSpeed = Math.max(30, Math.min(canvasWidth, canvasHeight) * 0.045);
		this.done = false;
	}

	update() {
		this.life += 1;
		this.clearRadius += this.clearSpeed;

		if (this.clearRadius >= this.maxRadius * 0.9) {
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
		const centerAlpha = (1 - smoothstep(0.05, 0.72, progress)) * 0.95;
		const ringSoftness = lerp(1.05, 1.22, progress);

		layerCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

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

// ─────────────────────────────────────────────────────────────────────────────
// Prayer aura flow: start mới, theo tay mềm, thả tay thì fade.
// ─────────────────────────────────────────────────────────────────────────────
export function triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, options = {}) {
	initDomRefs();
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

	if (!reward) {
		return aura;
	}

	// Âm thanh và phản hồi phụ chỉ chạy ở lần kích hoạt chính, không chạy khi refresh.
	playZenSound();

	// Kích hoạt xóa sương khói Dark Veil (thông qua hook để tránh circular import)
	if (typeof state._onGestureTriggered === 'function') {
		state._onGestureTriggered(effectX, midY);
	}

	// Tích phước — badge pop animation
	const newCount = incrementPhuoc();
	if (phuocDisplay) phuocDisplay.innerText = newCount;
	if (phuocBadge) {
		const plusOne = document.createElement('span');
		plusOne.className = 'phuoc-plus-one';
		plusOne.innerText = '+1';
		phuocBadge.appendChild(plusOne);
		setTimeout(() => plusOne.remove(), 900);

		phuocBadge.classList.remove('popping');
		// Force reflow để restart animation
		void phuocBadge.offsetWidth;
		phuocBadge.classList.add('popping');
		setTimeout(() => phuocBadge.classList.remove('popping'), 500);
	}

	return aura;
}

export function updateAuraEffects(midX, midY, canvasWidth, canvasHeight, options = {}) {
	const currentAura = state.prayerAuras[0] || null;
	if (!currentAura || currentAura.done) return null;
	return currentAura;
}

export function releaseAuraEffects() {
	return;
}

// ─────────────────────────────────────────────────────────────────────────────
// hexToRgb — chuyển hex sang "r, g, b" string
// ─────────────────────────────────────────────────────────────────────────────
export function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
		: '255, 215, 0';
}
