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

// Lớp đối tượng Sóng xung kích bao quanh người (Aura Body Lines)
export class AuraLineWave {
  constructor(points, theme, canvasWidth, canvasHeight, delay = 0) {
    this.points = points.map((p) => ({ x: p.x, y: p.y }));
    this.themeColors = THEME_COLORS[theme];
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.life = 0;
    this.maxLife = 70; // Tăng thời gian sống một chút để mượt hơn
    this.delay = delay;
    this.done = false;

    // Tính toán tâm của silhouette
    const center = this.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    this.center = { x: center.x / this.points.length, y: center.y / this.points.length };
    
    // Tính bán kính trung bình để dùng cho hiệu ứng "tròn dần"
    this.avgRadius = this.points.reduce((acc, p) => acc + Math.hypot(p.x - this.center.x, p.y - this.center.y), 0) / this.points.length;
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

    // Tiến trình (0 -> 1)
    const p = this.life / this.maxLife;
    
    // 1. Chậm lúc đầu, nhanh dần ra ngoài (Ease-in logic)
    const expansionScale = 1.0 + Math.pow(p, 1.8) * 1.5;
    
    // 2. Hiệu ứng "Tròn dần": Morping từ silhouette sang hình tròn
    // p = 0: giữ nguyên shape gốc, p = 1: 80% là hình tròn
    const morphToCircle = p * 0.85; 

    // 3. Sáng dần rồi mờ dần
    // Sáng nhất ở khoảng 30% hành trình
    const brightnessAlpha = Math.sin(Math.PI * Math.pow(p, 0.7)); 
    const finalAlpha = brightnessAlpha * (1 - p);

    ctx.save();
    ctx.globalAlpha = finalAlpha;
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = this.themeColors.primary;
    ctx.lineWidth = 3 + (1 - p) * 5; // Nét vẽ thanh mảnh dần
    ctx.shadowBlur = 20 * brightnessAlpha;
    ctx.shadowColor = this.themeColors.primary;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    this.points.forEach((pt, i) => {
      // Tọa độ vector từ tâm
      const dx = pt.x - this.center.x;
      const dy = pt.y - this.center.y;
      const dist = Math.hypot(dx, dy);
      
      // Vector đơn vị
      const ux = dx / (dist || 1);
      const uy = dy / (dist || 1);

      // Mix giữa hình dạng gốc và hình dạng tròn trịa
      const targetDist = this.avgRadius; 
      const morphedDist = dist * (1 - morphToCircle) + targetDist * morphToCircle;
      
      const rx = this.center.x + ux * morphedDist * expansionScale;
      const ry = this.center.y + uy * morphedDist * expansionScale;
      
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
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
    this.vy = -2.5; 
    this.maxLife = 50; 
    this.life = this.maxLife;
  }

  update() {
    this.y += this.vy;
    this.life--;
    this.alpha = Math.pow(this.life / this.maxLife, 2);
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px "Comfortaa"';
    context.shadowBlur = 20;
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
    setTimeout(() => flashEffect.classList.remove('flash'), 80);
  }

  // 2. Thêm lớp viền phát sáng ở khung camera
  if (cameraWrapper) cameraWrapper.classList.add('aura-active');
  if (gestureTriggeredMsg) gestureTriggeredMsg.classList.add('active');
  
  setTimeout(() => {
    if (cameraWrapper) cameraWrapper.classList.remove('aura-active');
    if (gestureTriggeredMsg) gestureTriggeredMsg.classList.remove('active');
  }, 2200);

  // 3. Tạo Line Waves thay vì Particles
  if (hasOutline) {
    state.bodyAuraWaves.push(new AuraLineWave(outlinePoints, state.activePreset, canvasWidth, canvasHeight, 0));
    state.bodyAuraWaves.push(new AuraLineWave(outlinePoints, state.activePreset, canvasWidth, canvasHeight, 15));
    state.bodyAuraWaves.push(new AuraLineWave(outlinePoints, state.activePreset, canvasWidth, canvasHeight, 30));
  } else {
    // Fallback Ripples
    state.ripples.push(new Ripple(effectX, midY, state.activePreset, canvasWidth, canvasHeight));
  }

  // 5. Phát tiếng chuông thiền
  playZenSound();

  // 6. Cộng phước tích lũy
  const newCount = incrementPhuoc();
  if (phuocDisplay) phuocDisplay.innerText = newCount;
  
  state.floatingTexts.push(new FloatingText(effectX, midY - 60, "+1 PHƯỚC ✨", theme.primary));

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


