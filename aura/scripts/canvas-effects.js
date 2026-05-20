import { state, incrementPhuoc } from "./state.js";
import { THEME_COLORS } from "./constants.js";
import { playZenSound } from "./audio.js";

// DOM references required for triggers
let flashEffect = null;
let cameraWrapper = null;
let gestureInstruction = null;
let gestureTriggeredMsg = null;
let phuocDisplay = null;

function initDomRefs() {
  if (!flashEffect) flashEffect = document.getElementById('flash-effect');
  if (!cameraWrapper) cameraWrapper = document.getElementById('camera-wrapper');
  if (!gestureInstruction) gestureInstruction = document.getElementById('gesture-instruction');
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
  if (gestureInstruction) {
    gestureInstruction.classList.add('hidden');
  }
  if (gestureTriggeredMsg) {
    gestureTriggeredMsg.classList.add('active');
  }
  
  setTimeout(() => {
    if (cameraWrapper) cameraWrapper.classList.remove('aura-active');
    if (gestureTriggeredMsg) gestureTriggeredMsg.classList.remove('active');
    // Chỉ hiển thị lại hướng dẫn nếu không còn giữ tay chắp
    if (!state.gestureActive && gestureInstruction) {
      gestureInstruction.classList.remove('hidden');
    }
  }, 2200);

  // 3. Khởi tạo 200 hạt ánh sáng bắn ra từ tay
  for (let i = 0; i < 200; i++) {
    state.particles.push(new Particle(midX, midY, state.activePreset, canvasWidth, canvasHeight));
  }

  // 4. Khởi tạo 3 đợt sóng xung kích lan rộng
  state.ripples.push(new Ripple(midX, midY, state.activePreset, canvasWidth, canvasHeight));
  setTimeout(() => {
    state.ripples.push(new Ripple(midX, midY, state.activePreset, canvasWidth, canvasHeight));
  }, 200);
  setTimeout(() => {
    state.ripples.push(new Ripple(midX, midY, state.activePreset, canvasWidth, canvasHeight));
  }, 450);

  // 5. Phát tiếng chuông thiền
  playZenSound();

  // 6. Cộng phước tích lũy (localStorage) & tạo hiệu ứng chữ bay
  const newCount = incrementPhuoc();
  if (phuocDisplay) {
    phuocDisplay.innerText = newCount;
  }
  
  const theme = THEME_COLORS[state.activePreset];
  state.floatingTexts.push(new FloatingText(midX, midY - 40, "+1 Phước ✨", theme.primary));

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
