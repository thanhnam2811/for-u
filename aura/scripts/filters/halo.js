import { state } from "../state.js";
import { THEME_COLORS } from "../constants.js";

// FILTER 3: Vòng Thiên Thần Neon Cao Cấp (God Rays & Orbitals) 👼✨
export function drawHalo(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, fhX, fhY } = metrics;
  const time = performance.now();

  // Hiệu ứng nhấp nhô mượt mà
  const hoverY = fhY - eyeDist * 1.1 + Math.sin(time / 400) * eyeDist * 0.15; // Nâng cao hơn nữa

  ctx.save();
  ctx.translate(fhX, hoverY);
  ctx.rotate(angle + Math.sin(time / 1000) * 0.05);

  const theme = THEME_COLORS[state.activePreset];
  const haloRX = eyeDist * 1.2; // Rộng hơn hẳn khuôn mặt
  const haloRY = eyeDist * 0.35; // Độ dẹt lớn hơn

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 1. OUTER GLOW (Lan tỏa rộng)
  ctx.save();
  const glowGrad = ctx.createRadialGradient(0, 0, eyeDist * 0.2, 0, 0, eyeDist * 1.5);
  glowGrad.addColorStop(0, hexToRgba(theme.primary, 0.3));
  glowGrad.addColorStop(0.6, hexToRgba(theme.primary, 0.1));
  glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, eyeDist * 1.5, eyeDist * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. GOD RAYS (Tia sáng thiên đường)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const rayCount = 8;
  for (let i = 0; i < rayCount; i++) {
    const rayAngle = -Math.PI * 0.9 + (i / (rayCount - 1)) * Math.PI * 0.8 + Math.sin(time / 1500 + i) * 0.1;
    const rayLen = eyeDist * (1.2 + Math.sin(time / 800 + i * 2) * 0.4);
    
    const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(rayAngle) * rayLen, Math.sin(rayAngle) * rayLen);
    rayGrad.addColorStop(0, hexToRgba(theme.primary, 0.4));
    rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.strokeStyle = rayGrad;
    ctx.lineWidth = eyeDist * 0.04;
    ctx.beginPath();
    ctx.moveTo(Math.cos(rayAngle) * haloRX * 0.5, Math.sin(rayAngle) * haloRY * 0.5);
    ctx.lineTo(Math.cos(rayAngle) * rayLen, Math.sin(rayAngle) * rayLen);
    ctx.stroke();
  }
  ctx.restore();

  // 3. MAIN RING (Neon Bloom Effect)
  ctx.save();
  ctx.shadowColor = theme.primary;
  ctx.strokeStyle = "#ffffff";

  // Lớp 1: Lớp phát sáng nhòe diện rộng (Neon Aura)
  ctx.shadowBlur = 45;
  ctx.lineWidth = eyeDist * 0.15;
  ctx.beginPath();
  ctx.ellipse(0, 0, haloRX, haloRY, 0, 0, 2 * Math.PI);
  ctx.stroke();

  // Lớp 2: Lõi sáng sắc nét ở giữa
  ctx.shadowBlur = 15;
  ctx.lineWidth = eyeDist * 0.05;
  ctx.stroke();
  ctx.restore();

  // 4. ORBITING PARTICLES (Các hạt bay quanh)
  const particleCount = 6;
  for (let i = 0; i < particleCount; i++) {
    const pAngle = (time / 600) + (i * Math.PI * 2 / particleCount);
    const px = Math.cos(pAngle) * haloRX * 1.1;
    const py = Math.sin(pAngle) * haloRY * 1.1;
    
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.primary;
    ctx.beginPath();
    ctx.arc(px, py, eyeDist * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
