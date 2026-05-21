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
  // 1. CINEMATIC SOFT-LIGHT (Lớp phủ màu điện ảnh)
  // =============================================
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const cinematicGrad = ctx.createRadialGradient(faceCX, faceCY, eyeDist * 0.5, faceCX, faceCY, canvasWidth);
  cinematicGrad.addColorStop(0, 'rgba(255, 200, 100, 0.25)');
  cinematicGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = cinematicGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  // =============================================
  // 2. AURA GLOW (Gia lập Blur vùng chữ T)
  // =============================================
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const auraGrad = ctx.createRadialGradient(faceCX, faceCY, eyeDist * 0.8, faceCX, faceCY, eyeDist * 4);
  auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  auraGrad.addColorStop(0.5, hexToRgba(theme.primary, 0.12));
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(faceCX, faceCY, eyeDist * 2, eyeDist * 3, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // =============================================
  // 3. DYNAMIC SPARKLES (TikTok Style)
  // =============================================
  ctx.save();
  const sparkleCount = 15;
  for (let i = 0; i < sparkleCount; i++) {
    const orbitAngle = (i / sparkleCount) * Math.PI * 2 + time / 2500;
    const orbitR = eyeDist * (1.5 + Math.sin(time / 1200 + i) * 0.5);
    const sx = faceCX + Math.cos(orbitAngle) * orbitR;
    const sy = faceCY + Math.sin(orbitAngle) * orbitR * 0.7;

    const size = eyeDist * (0.05 + Math.sin(time / 400 + i * 1.5) * 0.02);
    const rotation = time / 1000 + i;
    
    drawSparkle(ctx, sx, sy, size, rotation, theme.primary);
  }
  ctx.restore();
}

// Hàm vẽ ngôi sao 4 cánh chuyên nghiệp
function drawSparkle(ctx, cx, cy, size, rotation, glowColor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
      ctx.lineTo(0, size);
      ctx.lineTo(size * 0.2, size * 0.2);
      ctx.rotate(Math.PI / 2);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 15;
  ctx.shadowColor = glowColor;
  ctx.fill();
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
