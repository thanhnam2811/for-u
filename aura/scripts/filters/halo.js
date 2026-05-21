import { state } from "../state.js";
import { THEME_COLORS } from "../constants.js";

// FILTER 3: Vòng Thiên Thần Neon Lơ Lửng Nâng Cấp 👼✨
export function drawHalo(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, fhX, fhY } = metrics;

  // Hiệu ứng nhấp nhô nhẹ nhàng bằng hàm Math.sin theo thời gian thực
  const hoverY = fhY - eyeDist * 0.7 + Math.sin(performance.now() / 250) * eyeDist * 0.12;

  ctx.save();
  ctx.translate(fhX, hoverY);
  ctx.rotate(angle + 0.05);

  const theme = THEME_COLORS[state.activePreset];
  const time = performance.now();

  // Kích thước ellipse hào quang
  const haloRX = eyeDist * 0.75;
  const haloRY = eyeDist * 0.22;

  // =============================================
  // 1. OUTER GLOW: vùng sáng mờ lớn phía sau vòng hào quang
  // =============================================
  ctx.save();
  const outerGlow = ctx.createRadialGradient(0, 0, eyeDist * 0.1, 0, 0, eyeDist * 1.2);
  outerGlow.addColorStop(0, theme.primary.replace(')', ', 0.2)').replace('rgb(', 'rgba(').replace('#', ''));
  // Xử lý hex color an toàn
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  // Vẽ lại glow đúng cách với hex
  ctx.globalAlpha = 1;
  const glowGrad = ctx.createRadialGradient(0, 0, eyeDist * 0.15, 0, 0, eyeDist * 1.3);
  glowGrad.addColorStop(0, hexToRgba(theme.primary, 0.2));
  glowGrad.addColorStop(0.5, hexToRgba(theme.primary, 0.08));
  glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, eyeDist * 1.3, eyeDist * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // =============================================
  // 2. LIGHT RAYS: tia sáng mỏng toả lên trên từ vòng hào quang
  // =============================================
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = eyeDist * 0.015;
  ctx.lineCap = 'round';

  const rayCount = 5;
  for (let i = 0; i < rayCount; i++) {
    // Góc tia phân bố đều phía trên, dao động nhẹ theo thời gian
    const baseAngle = -Math.PI * 0.85 + (i / (rayCount - 1)) * Math.PI * 0.7;
    const wobble = Math.sin(time / 800 + i * 1.5) * 0.05;
    const rayAngle = baseAngle + wobble;
    const rayLen = eyeDist * (0.5 + Math.sin(time / 600 + i) * 0.1);

    ctx.beginPath();
    ctx.moveTo(Math.cos(rayAngle) * haloRX * 0.6, Math.sin(rayAngle) * haloRY * 0.6);
    ctx.lineTo(Math.cos(rayAngle) * (haloRX + rayLen), Math.sin(rayAngle) * (haloRY + rayLen * 0.6));
    ctx.stroke();
  }
  ctx.restore();

  // =============================================
  // 3. MAIN RING: vòng hào quang chính phát sáng neon
  // =============================================
  ctx.shadowBlur = 30;
  ctx.shadowColor = theme.primary;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = eyeDist * 0.07;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.ellipse(0, 0, haloRX, haloRY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // =============================================
  // 4. INNER RING: vòng trong mỏng hơn tạo chiều sâu
  // =============================================
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.shadowBlur = 15;
  ctx.shadowColor = theme.secondary;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = eyeDist * 0.03;

  ctx.beginPath();
  ctx.ellipse(0, 0, haloRX * 0.88, haloRY * 0.85, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // =============================================
  // 5. SPARKLE PARTICLES: 5 hạt sao phát sáng xoay quanh vòng
  // =============================================
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 12;
  ctx.shadowColor = theme.primary;
  const sparkleTime = time / 450;

  for (let i = 0; i < 5; i++) {
    const spAngle = sparkleTime + (i * Math.PI * 2 / 5);
    const px = Math.cos(spAngle) * eyeDist * 0.85;
    const py = Math.sin(spAngle) * eyeDist * 0.28;
    // Kích thước thay đổi nhấp nháy tạo hiệu ứng lấp lánh
    const size = eyeDist * (0.03 + Math.sin(time / 200 + i * 2) * 0.015);

    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
