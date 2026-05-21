import { state, incrementPhuoc } from "./state.js";
import { THEME_COLORS } from "./constants.js";
import { playZenSound } from "./audio.js";

// DOM references required for triggers
let flashEffect = null;
let cameraWrapper = null;
let gestureTriggeredMsg = null;
let phuocDisplay = null;

function initDomRefs() {
  if (!flashEffect) flashEffect = document.getElementById('flash-effect');
  if (!cameraWrapper) cameraWrapper = document.getElementById('camera-wrapper');
  if (!gestureTriggeredMsg) gestureTriggeredMsg = document.getElementById('gesture-triggered-msg');
  if (!phuocDisplay) phuocDisplay = document.getElementById('phuoc-count-display');
}

// Lớp đối tượng Hạt sáng lấp lánh (Particles)
export class Particle {
  constructor(x, y, theme, canvasWidth, canvasHeight) {
    this.x = x;
    this.y = y;
    // Bắn hạt ra mọi hướng dạng tròn
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 8.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5; // Bay nhẹ lên trên
    
    this.size = 2 + Math.random() * 8;
    this.colorList = THEME_COLORS[theme].sparkles;
    this.color = this.colorList[Math.floor(Math.random() * this.colorList.length)];
    
    this.alpha = 1.0;
    this.maxLife = 35 + Math.random() * 45; // Số frames tồn tại
    this.life = this.maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Giảm tốc độ do lực cản ma sát
    this.vx *= 0.96;
    this.vy *= 0.96;
    
    this.life--;
    this.alpha = this.life / this.maxLife;
    this.size *= 0.97; // Hạt nhỏ dần đi
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = this.color;
    
    // Vẽ vầng sáng neon cho hạt
    context.shadowBlur = this.size * 1.5;
    context.shadowColor = this.color;
    
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

// Lớp đối tượng Sóng xung kích lan tỏa (Ripples)
export class Ripple {
  constructor(x, y, theme, canvasWidth, canvasHeight) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = Math.max(canvasWidth, canvasHeight) * 0.9;
    this.themeColors = THEME_COLORS[theme];
    this.color = this.themeColors.primary;
    this.alpha = 1.0;
    this.speed = 12 + Math.random() * 4; // Tốc độ lan tỏa
  }

  update() {
    this.radius += this.speed;
    this.alpha = 1 - (this.radius / this.maxRadius);
    this.speed *= 0.97; // Sóng chậm dần đi
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.strokeStyle = this.color;
    // Nét vẽ mỏng dần đi khi tỏa rộng
    context.lineWidth = 1 + 8 * (1 - this.radius / this.maxRadius);
    
    // Vẽ vầng hào quang phát sáng
    context.shadowBlur = 20;
    context.shadowColor = this.color;
    
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

class OutlineParticle {
  constructor(point, center, theme, canvasWidth, canvasHeight) {
    this.x = point.x;
    this.y = point.y;

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
    const angleJitter = (Math.random() - 0.5) * 0.45;
    const baseAngle = Math.atan2(dy, dx) + angleJitter;
    const speed = 4 + Math.random() * 7;

    this.vx = Math.cos(baseAngle) * speed;
    this.vy = Math.sin(baseAngle) * speed - 0.5;
    this.size = 2 + Math.random() * 6;
    this.colorList = THEME_COLORS[theme].sparkles;
    this.color = this.colorList[Math.floor(Math.random() * this.colorList.length)];
    this.alpha = 1;
    this.maxLife = 55 + Math.random() * 35;
    this.life = this.maxLife;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 1.012;
    this.vy *= 1.012;
    this.life--;

    const outsideFrame =
      this.x < -40 ||
      this.x > this.canvasWidth + 40 ||
      this.y < -40 ||
      this.y > this.canvasHeight + 40;

    if (outsideFrame) this.life = Math.min(this.life, 8);
    this.alpha = Math.max(0, this.life / this.maxLife);
    this.size *= 0.985;
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = this.color;
    context.shadowBlur = this.size * 2.4;
    context.shadowColor = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

export class BodyAuraWave {
  constructor(points, theme, canvasWidth, canvasHeight, delay = 0) {
    this.points = points.map((point) => ({ x: point.x, y: point.y }));
    this.themeColors = THEME_COLORS[theme];
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.delay = delay;
    this.age = 0;
    this.maxLife = 86;
    this.alpha = 1;
    this.done = false;

    const center = this.points.reduce((acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    }, { x: 0, y: 0 });
    this.center = {
      x: center.x / this.points.length,
      y: center.y / this.points.length
    };

    const cornerDistances = [
      Math.hypot(this.center.x, this.center.y),
      Math.hypot(canvasWidth - this.center.x, this.center.y),
      Math.hypot(this.center.x, canvasHeight - this.center.y),
      Math.hypot(canvasWidth - this.center.x, canvasHeight - this.center.y)
    ];
    this.maxSpread = Math.max(...cornerDistances) + 80;
  }

  update() {
    if (this.delay > 0) {
      this.delay--;
      return;
    }

    this.age++;
    const progress = Math.min(1, this.age / this.maxLife);
    this.alpha = Math.pow(1 - progress, 1.35);
    this.done = progress >= 1;
  }

  draw(context) {
    if (this.delay > 0 || this.done) return;

    const progress = Math.min(1, this.age / this.maxLife);
    const spread = this.maxSpread * (1 - Math.pow(1 - progress, 2.2));
    const pointSize = 1.8 + 5.2 * (1 - progress);

    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = this.alpha;
    context.fillStyle = this.themeColors.primary;
    context.shadowBlur = 26;
    context.shadowColor = this.themeColors.primary;

    this.points.forEach((point, index) => {
      if (index % 2 !== 0 && this.points.length > 150) return;

      const dx = point.x - this.center.x;
      const dy = point.y - this.center.y;
      const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
      const x = point.x + (dx / length) * spread;
      const y = point.y + (dy / length) * spread;

      if (x < -40 || x > this.canvasWidth + 40 || y < -40 || y > this.canvasHeight + 40) return;

      context.beginPath();
      context.arc(x, y, pointSize, 0, Math.PI * 2);
      context.fill();
    });

    context.restore();
  }
}

// Lớp đối tượng Chữ bay tích phước
export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.alpha = 1.0;
    this.vy = -1.8; // Bay lên trên
    this.maxLife = 60; // 1 giây
    this.life = this.maxLife;
  }

  update() {
    this.y += this.vy;
    this.life--;
    this.alpha = this.life / this.maxLife;
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = this.color;
    context.font = 'bold 24px "Comfortaa", "Quicksand", sans-serif';
    context.shadowBlur = 10;
    context.shadowColor = this.color;
    context.textAlign = 'center';
    context.fillText(this.text, this.x, this.y);
    context.restore();
  }
}

// Kích hoạt tất cả hiệu ứng hào quang khi chắp tay thành công
export function triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, showToastCallback) {
  initDomRefs();
  const theme = THEME_COLORS[state.activePreset];
  const bodyOutlinePoints = state.personOutlinePoints || [];
  const handOutlinePoints = state.handOutlinePoints || [];
  const outlinePoints = bodyOutlinePoints.length > 24 ? bodyOutlinePoints : handOutlinePoints;
  const hasOutline = outlinePoints.length > 12;
  const effectX = state.mirrorCamera ? canvasWidth - midX : midX;

  // 1. Chớp màn hình lóa sáng nhẹ
  if (flashEffect) {
    flashEffect.classList.add('flash');
    setTimeout(() => {
      flashEffect.classList.remove('flash');
    }, 80);
  }

  // 2. Thêm lớp viền phát sáng ở khung camera
  if (cameraWrapper) {
    cameraWrapper.classList.add('aura-active');
  }
  if (gestureTriggeredMsg) {
    gestureTriggeredMsg.classList.add('active');
  }
  
  setTimeout(() => {
    if (cameraWrapper) cameraWrapper.classList.remove('aura-active');
    if (gestureTriggeredMsg) gestureTriggeredMsg.classList.remove('active');
  }, 2200);

  if (hasOutline) {
    const center = outlinePoints.reduce((acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    }, { x: 0, y: 0 });
    center.x /= outlinePoints.length;
    center.y /= outlinePoints.length;

    state.bodyAuraWaves.push(new BodyAuraWave(outlinePoints, state.activePreset, canvasWidth, canvasHeight));
    state.bodyAuraWaves.push(new BodyAuraWave(outlinePoints, state.activePreset, canvasWidth, canvasHeight, 14));
    state.bodyAuraWaves.push(new BodyAuraWave(outlinePoints, state.activePreset, canvasWidth, canvasHeight, 30));

    // Staggered particle creation to avoid FPS spikes
    const emitParticles = (count, current = 0) => {
      const batch = 40;
      const toEmit = Math.min(batch, count - current);
      for (let i = 0; i < toEmit; i++) {
        const point = outlinePoints[Math.floor(Math.random() * outlinePoints.length)];
        state.particles.push(new OutlineParticle(point, center, state.activePreset, canvasWidth, canvasHeight));
      }
      if (current + toEmit < count) {
        requestAnimationFrame(() => emitParticles(count, current + toEmit));
      }
    };
    emitParticles(220);
  } else {
    // Fallback staggered emission
    const emitFallback = (count, current = 0) => {
      const batch = 30;
      const toEmit = Math.min(batch, count - current);
      for (let i = 0; i < toEmit; i++) {
        state.particles.push(new Particle(effectX, midY, state.activePreset, canvasWidth, canvasHeight));
      }
      if (current + toEmit < count) {
        requestAnimationFrame(() => emitFallback(count, current + toEmit));
      }
    };
    emitFallback(200);

    state.ripples.push(new Ripple(effectX, midY, state.activePreset, canvasWidth, canvasHeight));
    setTimeout(() => {
      state.ripples.push(new Ripple(effectX, midY, state.activePreset, canvasWidth, canvasHeight));
    }, 200);
    setTimeout(() => {
      state.ripples.push(new Ripple(effectX, midY, state.activePreset, canvasWidth, canvasHeight));
    }, 450);
  }

  // 5. Phát tiếng chuông thiền
  playZenSound();

  // 6. Cộng phước tích lũy (localStorage) & tạo hiệu ứng chữ bay
  const newCount = incrementPhuoc();
  if (phuocDisplay) {
    phuocDisplay.innerText = newCount;
  }
  
  state.floatingTexts.push(new FloatingText(effectX, midY - 40, "+1 Phước ✨", theme.primary));

  // 7. Hiển thị Toast thông báo qua callback để tránh phụ thuộc chéo
  if (showToastCallback) {
    showToastCallback("🙏 Tích phước thành công! Hào quang toả sáng! 🙏");
  }
}

// Vẽ một vầng sáng dịu dạng đài sen lung linh xung quanh camera
export function drawAmbientHalo(context, canvasWidth, canvasHeight) {
  context.save();
  const theme = THEME_COLORS[state.activePreset];
  
  // Tạo gradient tròn tỏa sáng
  const gradient = context.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, 20,
    canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.7
  );
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.3, 'rgba(' + hexToRgb(theme.primary) + ', 0.15)');
  gradient.addColorStop(0.6, 'rgba(' + hexToRgb(theme.primary) + ', 0.05)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  context.fillStyle = gradient;
  context.globalCompositeOperation = 'screen'; // Hòa trộn màu sáng
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  
  context.restore();
}

// Chuyển Hex sang RGB để hỗ trợ đặt độ trong suốt alpha
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '255, 215, 0';
}


