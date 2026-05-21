import { state } from "../state.js";
import { THEME_COLORS } from "../constants.js";

// FILTER 5: Làm Đẹp / Beauty Filter - Nâng cấp Cinematic & Smooth ✨💖
export function drawBeauty(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;

  ctx.save();

  const theme = THEME_COLORS[state.activePreset];
  const time = performance.now();

  // Tâm giữa khuôn mặt
  const faceCX = (leX + reX) / 2;
  const faceCY = (leY + reY) / 2;

  // =============================================
  // 1. CINEMATIC OVERLAY (Lớp phủ màu điện ảnh)
  // =============================================
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(255, 200, 150, 0.15)'; // Màu vàng nắng ấm
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  // =============================================
  // 2. SOFT FOCUS GLOW (Mạnh mẽ hơn, rộng hơn)
  // =============================================
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const softGlow = ctx.createRadialGradient(faceCX, faceCY, eyeDist * 0.8, faceCX, faceCY, eyeDist * 4);
  softGlow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  softGlow.addColorStop(0.5, hexToRgba(theme.primary, 0.12));
  softGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = softGlow;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  // =============================================
  // 3. DYNAMIC SPARKLES (Rộng hơn)
  // =============================================
  ctx.save();
  const sparkleCount = 15; // Tăng số lượng hạt
  for (let i = 0; i < sparkleCount; i++) {
    const orbitAngle = (i / sparkleCount) * Math.PI * 2 + time / 2500;
    const orbitR = eyeDist * (1.5 + Math.sin(time / 1200 + i) * 0.5); // Quỹ đạo rộng hơn
    const sx = faceCX + Math.cos(orbitAngle) * orbitR;
    const sy = faceCY + Math.sin(orbitAngle) * orbitR * 0.7;

    const size = eyeDist * (0.05 + Math.sin(time / 400 + i * 1.5) * 0.02);
    ctx.globalAlpha = 0.6 + Math.sin(time / 300 + i) * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.primary;
    
    drawStar(ctx, sx, sy, 4, size, size / 2.5);
  }
  ctx.restore();

  ctx.restore();
}

// Hàm vẽ ngôi sao đa năng
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
