import { state, LANTERN_LIFESPAN_MS } from "../state.js";

// Bộ nhớ đệm (Cache) để tăng hiệu suất. Vẽ gradient tốn CPU, 
// vẽ 1 lần ra canvas ảo rồi drawImage sẽ nhẹ như lông hồng!
let lanternCacheCanvas = null;
let lanternCacheCtx = null;

function createLanternCache() {
	if (lanternCacheCanvas) return;
	
	// Khởi tạo kích thước đủ chứa glow lớn nhất (bán kính 60 -> size 120)
	lanternCacheCanvas = document.createElement('canvas');
	lanternCacheCanvas.width = 120;
	lanternCacheCanvas.height = 120;
	lanternCacheCtx = lanternCacheCanvas.getContext('2d');

	const ctx = lanternCacheCtx;
	const cx = 60;
	const cy = 60;

	// 1. Quầng sáng (Glow)
	const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
	glow.addColorStop(0, 'rgba(255, 220, 120, 0.85)');
	glow.addColorStop(0.25, 'rgba(255, 140, 50, 0.45)');
	glow.addColorStop(1, 'rgba(255, 80, 0, 0)');
	
	ctx.globalCompositeOperation = 'screen';
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.arc(cx, cy, 60, 0, Math.PI * 2);
	ctx.fill();

	// 2. Đế hoa đăng (Ellipse ngang)
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = 'rgba(255, 170, 90, 0.95)';
	ctx.beginPath();
	ctx.ellipse(cx, cy + 10, 16, 6, 0, 0, Math.PI * 2);
	ctx.fill();

	// 3. Lõi lửa (Tear drop flame)
	ctx.globalCompositeOperation = 'screen';
	const flame = ctx.createRadialGradient(cx, cy + 2, 0, cx, cy + 2, 12);
	flame.addColorStop(0, 'rgba(255, 255, 255, 1)');
	flame.addColorStop(0.4, 'rgba(255, 230, 160, 0.9)');
	flame.addColorStop(1, 'rgba(255, 150, 50, 0)');
	
	ctx.fillStyle = flame;
	ctx.beginPath();
	ctx.moveTo(cx, cy - 12);
	ctx.quadraticCurveTo(cx + 8, cy + 5, cx, cy + 10);
	ctx.quadraticCurveTo(cx - 8, cy + 5, cx, cy - 12);
	ctx.fill();
}

export class LotusLantern {
	constructor(config) {
		createLanternCache();

		this.canvasWidth = config.canvasWidth || window.innerWidth;
		this.canvasHeight = config.canvasHeight || window.innerHeight;
		
		if (config.id) {
			this.id = config.id;
			this.spawnedAt = config.spawnedAt;
			this.xRatio = config.xRatio;
			this.baseYRatio = config.baseYRatio;
			this.phaseSeed = config.phaseSeed;
			
			this.startX = config.startX || (this.canvasWidth / 2);
			this.startY = config.startY || (this.canvasHeight / 2);
			this.phase = 'FLOATING';
		} else {
			this.id = `ltn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			this.spawnedAt = Date.now();
			this.phaseSeed = Math.random() * Math.PI * 2;
			
			this.startX = config.startX;
			this.startY = config.startY;
			
			// Phân tán đều toàn màn hình theo chiều ngang
			this.targetX = 60 + Math.random() * (this.canvasWidth - 120); 
			this.targetY = this.canvasHeight * (0.75 + Math.random() * 0.2);
			
			this.xRatio = this.targetX / this.canvasWidth;
			this.baseYRatio = this.targetY / this.canvasHeight;
			this.phase = 'SPAWNING';
		}

		// Tạo các hệ số cố định dựa trên phaseSeed để đảm bảo tái lập khi F5
		const r1 = (this.phaseSeed * 13.37) % 1;
		const r2 = (this.phaseSeed * 42.19) % 1;
		const r3 = (this.phaseSeed * 73.11) % 1;

		// Giới hạn độ nhấp nhô cao thấp (8 đến 16 pixel)
		this.bobAmplitude = 8 + r1 * 8;
		
		// Giới hạn tốc độ nhịp nhấp nhô (êm dịu)
		this.bobSpeed = 0.001 + r2 * 0.0012; 
		
		// Chỉ trôi 1 chiều từ trái sang phải (giá trị dương). Tốc độ chậm rãi.
		this.driftSpeedX = 0.01 + r3 * 0.02;
		
		// Lưu bù trừ để tránh giật khi bắt đầu hình sin
		this.sineOffsetX = Math.sin(this.phaseSeed) * 15;
		this.sineOffsetY = Math.sin(this.phaseSeed) * this.bobAmplitude;

		this.alpha = 0;
		this.scale = 0.3;
	}

	startFadeOut() {
		if (this.phase !== 'FADING' && this.phase !== 'DONE') {
			this.phase = 'FADING';
		}
	}

	update(currentCanvasWidth, currentCanvasHeight) {
		// Cập nhật kích thước canvas thực tế (để fix lỗi F5)
		if (currentCanvasWidth && currentCanvasHeight) {
			this.canvasWidth = currentCanvasWidth;
			this.canvasHeight = currentCanvasHeight;
		}

		const timeAlive = Date.now() - this.spawnedAt;
		const lifeProgress = timeAlive / LANTERN_LIFESPAN_MS;

		if (lifeProgress >= 1) {
			this.phase = 'DONE';
			return;
		}

		// Alpha mượt mà: fade out ở 20% cuối đời
		let baseAlpha = 1;
		if (lifeProgress > 0.8) {
			baseAlpha = 1 - (lifeProgress - 0.8) / 0.2;
		}

		this.targetX = this.xRatio * this.canvasWidth;
		this.baseY = this.baseYRatio * this.canvasHeight;

		if (timeAlive < 2000) {
			this.phase = 'SPAWNING';
			const progress = timeAlive / 2000;
			const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out
			
			this.x = this.startX + (this.targetX - this.startX) * ease;
			this.y = this.startY + (this.baseY - this.startY) * ease;
			
			this.alpha = Math.min(1, progress * 1.5);
			this.scale = 0.3 + 0.7 * ease;
		} else {
			if (this.phase === 'SPAWNING') this.phase = 'FLOATING';
			
			const floatTime = timeAlive - 2000;
			
			// Tính toán trục ngang trôi đi liên tục
			let rawX = this.targetX + floatTime * this.driftSpeedX;
			const wrapWidth = this.canvasWidth + 200;
			rawX = ((rawX + 100) % wrapWidth + wrapWidth) % wrapWidth - 100;
			
			// Áp dụng nhịp nhấp nhô
			this.x = rawX + Math.sin(floatTime * this.bobSpeed * 0.5 + this.phaseSeed) * 15 - this.sineOffsetX;
			this.y = this.baseY + Math.sin(floatTime * this.bobSpeed + this.phaseSeed) * this.bobAmplitude - this.sineOffsetY;
			
			if (this.phase === 'FLOATING') {
				this.alpha = baseAlpha;
				this.scale = 1;
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

	draw(ctx) {
		if (this.phase === 'DONE' || this.alpha <= 0) return;

		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.scale(this.scale, this.scale);
		
		// Hơi nhấp nháy (flicker) như ngọn nến thật
		const flicker = 0.95 + Math.random() * 0.05;
		ctx.globalAlpha = this.alpha * flicker;

		// Vẽ hình ảnh đã cache (nhanh hơn vẽ trực tiếp 10 lần)
		ctx.drawImage(lanternCacheCanvas, -60, -60);

		ctx.restore();
	}
}
