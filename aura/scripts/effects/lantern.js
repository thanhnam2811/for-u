import { state, LANTERN_LIFESPAN_MS, LANTERN_TYPES, LANTERN_ASSETS } from "../state.js";

// Preload Images into Cache
const SVG_IMAGES = {};
Object.keys(LANTERN_ASSETS).forEach(key => {
	const img = new Image();
	img.src = LANTERN_ASSETS[key].dataUrl;
	SVG_IMAGES[key] = img;
});

// Bộ nhớ đệm (Cache) canvas riêng biệt cho từng loại hoa đăng
const lanternCaches = {};

function hashString(input) {
	let hash = 2166136261;
	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function createSeededRandom(seedText) {
	let seed = hashString(seedText) || 1;
	return () => {
		seed = (seed + 0x6D2B79F5) | 0;
		let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function getLanternCache(type) {
	if (lanternCaches[type]) return lanternCaches[type];

	const canvas = document.createElement('canvas');
	canvas.width = 120;
	canvas.height = 120;
	const ctx = canvas.getContext('2d');
	const cx = 60, cy = 60;

	// Cấu hình màu sắc theo loại
	let innerColor, midColor, outerColor, baseColor;
	if (type === 'crystal') {
		innerColor = 'rgba(200, 240, 255, 0.9)';
		midColor = 'rgba(100, 200, 255, 0.6)';
		outerColor = 'rgba(50, 150, 255, 0)';
		baseColor = 'rgba(150, 220, 255, 0.95)';
	} else if (type === 'dragon') {
		innerColor = 'rgba(255, 250, 150, 0.9)';
		midColor = 'rgba(255, 200, 50, 0.6)';
		outerColor = 'rgba(255, 100, 0, 0)';
		baseColor = 'rgba(255, 220, 100, 0.95)';
	} else { 
		// basic - Hoa Sen
		innerColor = 'rgba(255, 220, 120, 0.85)';
		midColor = 'rgba(255, 140, 50, 0.45)';
		outerColor = 'rgba(255, 80, 0, 0)';
		baseColor = 'rgba(255, 170, 90, 0.95)';
	}

	// 1. Quầng sáng (Glow)
	const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
	glow.addColorStop(0, innerColor);
	glow.addColorStop(0.25, midColor);
	glow.addColorStop(1, outerColor);
	
	ctx.globalCompositeOperation = 'screen';
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.arc(cx, cy, 60, 0, Math.PI * 2);
	ctx.fill();

	// 2. Vẽ hình ảnh SVG
	ctx.globalCompositeOperation = 'source-over';
	const img = SVG_IMAGES[type] || SVG_IMAGES['basic'];
	
	// Data URI tải siêu nhanh, nhưng nếu chưa xong thì đợi frame sau
	if (img.complete && img.naturalWidth > 0) {
		// Tâm của đèn là (60, 60), vẽ SVG size 50x50 ở giữa
		ctx.drawImage(img, cx - 25, cy - 25, 50, 50);
	} else {
		return null;
	}

	lanternCaches[type] = canvas;
	return canvas;
}

export class LotusLantern {
	constructor(config) {
		this.type = config.type || 'basic';
		const typeConfig = LANTERN_TYPES[this.type] || LANTERN_TYPES['basic'];
		this.configScale = typeConfig.scale;

		this.canvasWidth = config.canvasWidth || window.innerWidth;
		this.canvasHeight = config.canvasHeight || window.innerHeight;
		
		if (config.id) {
			this.id = config.id;
			this.spawnedAt = config.spawnedAt;
			this.xRatio = config.xRatio;
			this.baseYRatio = config.baseYRatio;
			
			this.startX = config.startX || (this.canvasWidth / 2);
			this.startY = config.startY || (this.canvasHeight / 2);
			this.phase = 'FLOATING';
		} else {
			this.id = `ltn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			this.spawnedAt = Date.now();
			
			this.startX = config.startX;
			this.startY = config.startY;
			this.phase = 'SPAWNING';
		}

		const seededRandom = createSeededRandom(this.id);
		this.phaseSeed = seededRandom() * Math.PI * 2;
		const horizontalMargin = 60;
		const safeWidth = Math.max(120, this.canvasWidth - horizontalMargin * 2);
		const seededXRatio = (horizontalMargin + seededRandom() * safeWidth) / this.canvasWidth;
		const seededBaseYRatio = 0.75 + seededRandom() * 0.2;

		if (!Number.isFinite(this.xRatio)) this.xRatio = seededXRatio;
		if (!Number.isFinite(this.baseYRatio)) this.baseYRatio = seededBaseYRatio;

		this.targetX = this.xRatio * this.canvasWidth;
		this.targetY = this.baseYRatio * this.canvasHeight;

		const r1 = seededRandom();
		const r2 = seededRandom();
		const r3 = seededRandom();
		const r4 = seededRandom();

		this.bobAmplitude = 8 + r1 * 8;
		this.bobSpeed = 0.001 + r2 * 0.0012; 
		this.driftSpeedX = (0.01 + r3 * 0.02) * (r4 > 0.5 ? 1 : -1);
		
		this.sineOffsetX = Math.sin(this.phaseSeed) * 15;
		this.sineOffsetY = Math.sin(this.phaseSeed) * this.bobAmplitude;

		this.alpha = 0;
		this.scale = 0.3 * this.configScale;
	}

	startFadeOut() {
		if (this.phase !== 'FADING' && this.phase !== 'DONE') {
			this.phase = 'FADING';
		}
	}

	update(now, currentCanvasWidth, currentCanvasHeight, quality = 'high') {
		if (currentCanvasWidth && currentCanvasHeight) {
			this.canvasWidth = currentCanvasWidth;
			this.canvasHeight = currentCanvasHeight;
		}

		const timeAlive = Math.max(0, now - this.spawnedAt);
		const lifeProgress = timeAlive / LANTERN_LIFESPAN_MS;
		const bobAmplitudeMultiplier = quality === 'low' ? 0.72 : quality === 'medium' ? 0.86 : 1;

		if (lifeProgress >= 1) {
			this.phase = 'DONE';
			return;
		}

		let baseAlpha = 1;
		if (lifeProgress > 0.8) {
			baseAlpha = 1 - (lifeProgress - 0.8) / 0.2;
		}

		this.targetX = this.xRatio * this.canvasWidth;
		this.baseY = this.baseYRatio * this.canvasHeight;

		if (timeAlive < 2000) {
			this.phase = 'SPAWNING';
			const progress = timeAlive / 2000;
			const ease = 1 - Math.pow(1 - progress, 3); 
			
			this.x = this.startX + (this.targetX - this.startX) * ease;
			this.y = this.startY + (this.baseY - this.startY) * ease;
			
			this.alpha = Math.min(1, progress * 1.5);
			this.scale = (0.3 + 0.7 * ease) * this.configScale;
		} else {
			if (this.phase === 'SPAWNING') this.phase = 'FLOATING';
			
			const floatTime = timeAlive - 2000;
			
			let rawX = this.targetX + floatTime * this.driftSpeedX;
			const wrapWidth = this.canvasWidth + 200;
			rawX = ((rawX + 100) % wrapWidth + wrapWidth) % wrapWidth - 100;
			
			this.x = rawX + Math.sin(floatTime * this.bobSpeed * 0.5 + this.phaseSeed) * 15 - this.sineOffsetX;
			this.y = this.baseY + Math.sin(floatTime * this.bobSpeed + this.phaseSeed) * (this.bobAmplitude * bobAmplitudeMultiplier) - this.sineOffsetY;
			
			if (this.phase === 'FLOATING') {
				this.alpha = baseAlpha;
				this.scale = this.configScale;
			} else if (this.phase === 'FADING') {
				this.forceAlpha = (this.forceAlpha !== undefined) ? this.forceAlpha : baseAlpha;
				this.forceAlpha -= 0.008;
				this.scale -= 0.002;
				this.alpha = this.forceAlpha;
				if (this.alpha <= 0) {
					this.phase = 'DONE';
				}
			}
		}
	}

	draw(ctx, now = performance.now(), quality = 'high') {
		if (this.alpha <= 0) return;
		const cache = getLanternCache(this.type);
		if (!cache) return; // Chờ ảnh SVG tải xong
		
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.scale(this.scale, this.scale);
		
		const flickerStrength = quality === 'low' ? 0.02 : quality === 'medium' ? 0.035 : 0.05;
		const flicker = 1 - flickerStrength + ((Math.sin(now * 0.008 + this.phaseSeed * 9) + 1) * 0.5 * flickerStrength * 2);
		ctx.globalAlpha = this.alpha * flicker;

		// Vẽ hình ảnh đã cache (nhanh hơn vẽ trực tiếp 10 lần)
		ctx.drawImage(cache, -60, -60);

		ctx.restore();
	}
}
