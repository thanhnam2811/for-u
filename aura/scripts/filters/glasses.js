// FILTER 1: Kính Phi Công Aviator Cao Cấp (Có phản quang động) 😎✨
export function drawGlasses(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle } = metrics;
  const time = performance.now();

  // Trọng tâm nằm ở trung điểm 2 mắt
  const midX = (leX + reX) / 2;
  const midY = (leY + reY) / 2;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  // === KÍCH THƯỚC TỔNG THỂ ===
  const lensW = eyeDist * 0.65;   // Tăng chiều rộng tròng
  const lensH = eyeDist * 0.6;    // Tăng chiều cao tròng
  const lensOffX = eyeDist * 0.55; // Khoảng cách tâm tròng
  const lensY = eyeDist * 0.05;    // Offset dọc

  // --- Hàm vẽ tròng kính Aviator ---
  function drawAviatorLens(cx, cy) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - lensH * 0.45);
    ctx.bezierCurveTo(cx + lensW * 0.6, cy - lensH * 0.48, cx + lensW * 0.95, cy - lensH * 0.25, cx + lensW * 0.9, cy + lensH * 0.05);
    ctx.bezierCurveTo(cx + lensW * 0.88, cy + lensH * 0.35, cx + lensW * 0.55, cy + lensH * 0.55, cx, cy + lensH * 0.5);
    ctx.bezierCurveTo(cx - lensW * 0.55, cy + lensH * 0.55, cx - lensW * 0.88, cy + lensH * 0.35, cx - lensW * 0.9, cy + lensH * 0.05);
    ctx.bezierCurveTo(cx - lensW * 0.95, cy - lensH * 0.25, cx - lensW * 0.6, cy - lensH * 0.48, cx, cy - lensH * 0.45);
    ctx.closePath();
  }

  function drawLensWithEffects(cx, cy, isRight) {
    ctx.save();
    
    // Đổ bóng (Drop Shadow) cho tròng kính tạo độ sâu 3D
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;

    drawAviatorLens(cx, cy);
    
    // Gradient kính râm động
    const grad = ctx.createLinearGradient(cx - lensW, cy - lensH, cx + lensW + Math.sin(time * 0.003) * 50, cy + lensH);
    grad.addColorStop(0, 'rgba(10, 15, 30, 0.95)');
    grad.addColorStop(0.5 + Math.sin(time * 0.003) * 0.1, 'rgba(30, 50, 100, 0.95)');
    grad.addColorStop(0.6 + Math.sin(time * 0.003) * 0.1, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.7 + Math.sin(time * 0.003) * 0.1, 'rgba(10, 15, 30, 0.95)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Tắt shadow để vẽ viền kim loại sáng
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = eyeDist * 0.025;
    ctx.stroke();

    // Điểm lóe sáng (Sparkle)
    if (Math.sin(time / 500 + (isRight ? 1 : 0)) > 0.8) {
      const sx = cx + lensW * 0.3;
      const sy = cy - lensH * 0.2;
      const size = eyeDist * 0.15 * (Math.sin(time / 200) * 0.5 + 0.5);
      
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx - size, sy);
      ctx.lineTo(sx, sy - size * 0.2);
      ctx.lineTo(sx + size, sy);
      ctx.lineTo(sx, sy + size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx, sy - size);
      ctx.lineTo(sx + size * 0.2, sy);
      ctx.lineTo(sx, sy + size);
      ctx.lineTo(sx - size * 0.2, sy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawLensWithEffects(-lensOffX, lensY, false);
  drawLensWithEffects(lensOffX, lensY, true);

  // === CẦU NỐI (Bridge) ===
  ctx.strokeStyle = '#bbbbbb';
  ctx.lineWidth = eyeDist * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-lensOffX + lensW * 0.85, lensY - lensH * 0.1);
  ctx.quadraticCurveTo(0, lensY - lensH * 0.35, lensOffX - lensW * 0.85, lensY - lensH * 0.1);
  ctx.stroke();

  // === CÀNG KÍNH (Temple Arms) ===
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = eyeDist * 0.03;
  ctx.beginPath();
  ctx.moveTo(-lensOffX - lensW * 0.88, lensY - lensH * 0.05);
  ctx.quadraticCurveTo(-lensOffX - lensW * 1.3, lensY - lensH * 0.15, -lensOffX - lensW * 1.5, lensY + lensH * 0.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lensOffX + lensW * 0.88, lensY - lensH * 0.05);
  ctx.quadraticCurveTo(lensOffX + lensW * 1.3, lensY - lensH * 0.15, lensOffX + lensW * 1.5, lensY + lensH * 0.1);
  ctx.stroke();

  // === HIỆU ỨNG CHỮ "THUG LIFE" ===
  if (Math.floor(time / 5000) % 2 === 0) {
    const textAlpha = Math.max(0, Math.min(1, Math.sin(time / 1000) * 2));
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.font = `bold ${eyeDist * 0.4}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("THUG LIFE", 0, -lensH * 1.5);
    ctx.strokeText("THUG LIFE", 0, -lensH * 1.5);
    ctx.restore();
  }

  ctx.restore();
}
