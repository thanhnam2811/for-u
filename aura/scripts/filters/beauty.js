import { state } from "../state.js";
import { THEME_COLORS } from "../constants.js";

// FILTER 5: Làm Đẹp / Beauty Filter - Che khuyết điểm + tỏa sáng ✨💖
export function drawBeauty(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;

  ctx.save();

  const theme = THEME_COLORS[state.activePreset];
  const time = performance.now();

  // Tâm giữa khuôn mặt (trung điểm hai mắt)
  const faceCX = (leX + reX) / 2;
  const faceCY = (leY + reY) / 2;

  // Hàm chuyển HEX sang RGBA an toàn
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // =============================================
  // 1. SOFT FOCUS GLOW: vùng sáng mềm mại tỏa ra từ tâm mặt
  //    Dùng globalCompositeOperation = 'screen' để hoà trộn lung linh
  // =============================================
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const softGlow = ctx.createRadialGradient(
    faceCX, faceCY, eyeDist * 0.3,
    faceCX, faceCY, eyeDist * 2.5
  );
  softGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  softGlow.addColorStop(0.35, hexToRgba(theme.primary, 0.08));
  softGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = softGlow;

  ctx.beginPath();
  ctx.arc(faceCX, faceCY, eyeDist * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // =============================================
  // 2. WARM SKIN TINT: lớp màu đào ấm nhẹ trên hai bên má
  //    Giúp cân bằng tông da, che vết thâm nhẹ
  // =============================================
  ctx.save();
  const cheekPositions = [
    { x: noseX - eyeDist * 0.55, y: noseY + eyeDist * 0.05 },
    { x: noseX + eyeDist * 0.55, y: noseY + eyeDist * 0.05 }
  ];

  cheekPositions.forEach(({ x, y }) => {
    const warmGrad = ctx.createRadialGradient(x, y, eyeDist * 0.02, x, y, eyeDist * 0.35);
    warmGrad.addColorStop(0, 'rgba(255, 200, 170, 0.12)');
    warmGrad.addColorStop(0.7, 'rgba(255, 200, 170, 0.06)');
    warmGrad.addColorStop(1, 'rgba(255, 200, 170, 0)');
    ctx.fillStyle = warmGrad;
    ctx.beginPath();
    ctx.arc(x, y, eyeDist * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();

  // =============================================
  // 3. EYE BRIGHTENING: ánh sáng trắng nhẹ tại mỗi mắt
  //    Làm đôi mắt sáng hơn, long lanh hơn
  // =============================================
  ctx.save();

  [{ x: leX, y: leY }, { x: reX, y: reY }].forEach(({ x, y }) => {
    const eyeGlow = ctx.createRadialGradient(x, y, 0, x, y, eyeDist * 0.15);
    eyeGlow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    eyeGlow.addColorStop(0.6, 'rgba(255, 255, 255, 0.08)');
    eyeGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(x, y, eyeDist * 0.15, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();

  // =============================================
  // 4. FLOATING SPARKLES: ngôi sao 4 cánh bay xoay quanh mặt
  //    Mỗi ngôi sao ở góc khác nhau, quay chậm theo thời gian thực
  // =============================================
  ctx.save();

  const sparkleCount = 7;

  // Hàm vẽ ngôi sao 4 cánh (hai hình thoi mỏng chồng lên nhau)
  function drawFourPointStar(cx, cy, size, rotAngle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotAngle);

    ctx.beginPath();
    // Hình thoi dọc
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.25, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.25, 0);
    ctx.closePath();
    ctx.fill();

    // Hình thoi ngang (xoay 90°)
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(0, size * 0.25);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, -size * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  for (let i = 0; i < sparkleCount; i++) {
    // Góc quỹ đạo: phân bố đều, quay chậm theo thời gian
    const orbitAngle = (i / sparkleCount) * Math.PI * 2 + time / 3000;
    // Bán kính quỹ đạo thay đổi nhẹ giữa các ngôi sao
    const orbitR = eyeDist * (1.5 + (i % 3) * 0.2);
    const sx = faceCX + Math.cos(orbitAngle) * orbitR;
    const sy = faceCY + Math.sin(orbitAngle) * orbitR * 0.7; // Nén dọc tạo cảm giác 3D

    // Kích thước nhấp nháy
    const starSize = eyeDist * (0.04 + Math.sin(time / 300 + i * 1.7) * 0.01);
    // Độ trong suốt lấp lánh
    const alpha = 0.5 + Math.sin(time / 250 + i * 2.3) * 0.3;

    ctx.save();
    ctx.globalAlpha = Math.max(0.15, alpha);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = theme.primary;

    drawFourPointStar(sx, sy, starSize, time / 800 + i);

    ctx.restore();
  }

  ctx.restore();

  // =============================================
  // 5. FACE FRAME SHIMMER: viền ánh sáng mỏng ôm hai bên mặt
  //    Cung tròn trắng mờ từ trán cong xuống qua má, tạo hiệu ứng tỏa sáng
  // =============================================
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = eyeDist * 0.02;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 8;
  ctx.shadowColor = hexToRgba(theme.primary, 0.3);

  // Viền trái: cung từ trán trái xuống má trái
  ctx.beginPath();
  ctx.moveTo(fhX - eyeDist * 0.7, fhY - eyeDist * 0.2);
  ctx.quadraticCurveTo(
    noseX - eyeDist * 0.95, noseY - eyeDist * 0.3,
    noseX - eyeDist * 0.75, noseY + eyeDist * 0.4
  );
  ctx.stroke();

  // Viền phải: đối xứng
  ctx.beginPath();
  ctx.moveTo(fhX + eyeDist * 0.7, fhY - eyeDist * 0.2);
  ctx.quadraticCurveTo(
    noseX + eyeDist * 0.95, noseY - eyeDist * 0.3,
    noseX + eyeDist * 0.75, noseY + eyeDist * 0.4
  );
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}
