import { THEME_COLORS } from "../constants.js";

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

export class BodyGlowPulse {
	constructor(points, theme, canvasWidth, canvasHeight, delay = 0) {
		this.points = points.map((point) => ({ x: point.x, y: point.y }));
		this.themeColors = THEME_COLORS[theme];
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.delay = delay;
		this.maxLife = 50;
		this.life = this.maxLife;
		this.done = false;
	}

	update() {
		if (this.delay > 0) {
			this.delay--;
			return;
		}
		this.life--;
		if (this.life <= 0) this.done = true;
	}

	draw(ctx) {
		if (this.delay > 0 || this.done || this.points.length < 5) return;

		const t = this.life / this.maxLife;
		const progress = 1 - t;
		const alpha = Math.sin(Math.PI * t) * 0.9;
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
		this.points.forEach((point, index) => {
			if (index === 0) ctx.moveTo(point.x, point.y);
			else ctx.lineTo(point.x, point.y);
		});
		ctx.closePath();
		ctx.stroke();

		ctx.lineWidth = 1;
		ctx.shadowBlur = blurSize * 2.5;
		ctx.stroke();
		ctx.restore();
	}
}

export class AuraLineWave {
	constructor(points, theme, canvasWidth, canvasHeight, delay = 0) {
		this.points = points.map((point) => ({ x: point.x, y: point.y }));
		this.themeColors = THEME_COLORS[theme];
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.life = 0;
		this.maxLife = 60;
		this.delay = delay;
		this.done = false;

		const center = this.points.reduce(
			(acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
			{ x: 0, y: 0 }
		);
		this.center = { x: center.x / this.points.length, y: center.y / this.points.length };
		this.avgRadius = this.points.reduce(
			(acc, point) => acc + Math.hypot(point.x - this.center.x, point.y - this.center.y),
			0
		) / this.points.length;
	}

	update() {
		if (this.delay > 0) {
			this.delay--;
			return;
		}
		this.life++;
		if (this.life >= this.maxLife) this.done = true;
	}

	draw(ctx) {
		if (this.delay > 0 || this.done || this.points.length < 5) return;

		const progress = this.life / this.maxLife;
		const t = 1 - Math.pow(1 - progress, 5);
		const morphToCircle = Math.pow(progress, 3.5);
		const targetDist = Math.max(this.canvasWidth, this.canvasHeight) * 1.25;
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
		this.points.forEach((point, index) => {
			const dx = point.x - this.center.x;
			const dy = point.y - this.center.y;
			const dist = Math.hypot(dx, dy);
			const ux = dx / (dist || 1);
			const uy = dy / (dist || 1);
			const currentRadius = dist * (1 - morphToCircle) + this.avgRadius * morphToCircle;
			const drawRadius = currentRadius + (targetDist * t);
			const rx = this.center.x + ux * drawRadius;
			const ry = this.center.y + uy * drawRadius;

			if (index === 0) ctx.moveTo(rx, ry);
			else ctx.lineTo(rx, ry);
		});
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
	}
}

export function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
		: '255, 215, 0';
}
