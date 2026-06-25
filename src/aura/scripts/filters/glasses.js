// FILTER 1: Kính Modern Luxury (Thương hiệu cao cấp) 😎✨
export function drawGlasses(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow = performance.now()) {
  const { leX, leY, reX, reY, eyeDist, angle } = metrics;
  const time = frameNow;

  // Trọng tâm nằm ở trung điểm 2 mắt
  const midX = (leX + reX) / 2;
  const midY = (leY + reY) / 2;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  // === THÔNG SỐ KÍNH SANG TRỌNG ===
  const frameW = eyeDist * 1.5;   // Toàn bộ chiều rộng khung
  const lensW = eyeDist * 0.72;    // Chiều rộng một mắt kính
  const lensH = eyeDist * 0.58;    // Chiều cao mắt kính (vuông bo góc/Gentle Monster style)
  const lensOffX = eyeDist * 0.42;  // Khoảng cách từ tâm
  const lensY = eyeDist * 0.02;

  // --- Hàm vẽ mắt kính kiểu hiện đại (Rectangular with rounded corners) ---
  function drawLuxuryLens(cx, cy) {
    const r = eyeDist * 0.12; // Bán kính bo góc
    ctx.beginPath();
    ctx.moveTo(cx - lensW / 2 + r, cy - lensH / 2);
    ctx.lineTo(cx + lensW / 2 - r, cy - lensH / 2);
    ctx.quadraticCurveTo(cx + lensW / 2, cy - lensH / 2, cx + lensW / 2, cy - lensH / 2 + r);
    ctx.lineTo(cx + lensW / 2, cy + lensH / 2 - r);
    ctx.quadraticCurveTo(cx + lensW / 2, cy + lensH / 2, cx + lensW / 2 - r, cy + lensH / 2);
    ctx.lineTo(cx - lensW / 2 + r, cy + lensH / 2);
    ctx.quadraticCurveTo(cx - lensW / 2, cy + lensH / 2, cx - lensW / 2, cy + lensH / 2 - r);
    ctx.lineTo(cx - lensW / 2, cy - lensH / 2 + r);
    ctx.quadraticCurveTo(cx - lensW / 2, cy - lensH / 2, cx - lensW / 2 + r, cy - lensH / 2);
    ctx.closePath();
  }

  function drawLensWithEffects(cx, cy, isRight) {
    ctx.save();
    
    // 1. Drop Shadow sâu hơn cho cảm giác cao cấp
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 15;

    // 2. Vẽ gọng kính dày (Acetate frame)
    ctx.lineWidth = eyeDist * 0.08;
    ctx.strokeStyle = '#050505'; // Đen bóng
    drawLuxuryLens(cx, cy);
    ctx.stroke();

    // 3. Vẽ tròng kính
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const grad = ctx.createLinearGradient(cx, cy - lensH / 2, cx, cy + lensH / 2);
    grad.addColorStop(0, '#101015');
    grad.addColorStop(0.5, '#1a1a20');
    grad.addColorStop(1, '#25252a');
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Phản quang động (Modern Gloss)
    const scanPos = (time * 0.0008) % 2;
    const glossGrad = ctx.createLinearGradient(
      cx - lensW + scanPos * lensW * 2, cy - lensH,
      cx + scanPos * lensW * 2, cy + lensH
    );
    glossGrad.addColorStop(0, 'rgba(255,255,255,0)');
    glossGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glossGrad;
    ctx.fill();

    // 5. Chi tiết Logo Vàng (Ký hiệu thương hiệu ở góc)
    ctx.globalCompositeOperation = 'source-over';
    const logoX = cx + (isRight ? 1 : -1) * (lensW / 2 - eyeDist * 0.1);
    const logoY = cy - lensH / 2 + eyeDist * 0.12;
    ctx.fillStyle = '#ffd700'; // Gold logo
    ctx.beginPath();
    ctx.arc(logoX, logoY, eyeDist * 0.015, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawLensWithEffects(-lensOffX, lensY, false);
  drawLensWithEffects(lensOffX, lensY, true);

  // === CẦU NỐI (Bridge) dày dặn ===
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = eyeDist * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-lensOffX + lensW / 4, lensY - lensH / 3);
  ctx.quadraticCurveTo(0, lensY - lensH / 2.5, lensOffX - lensW / 4, lensY - lensH / 3);
  ctx.stroke();

  // === CÀNG KÍNH (Temples) ===
  ctx.lineWidth = eyeDist * 0.08;
  ctx.beginPath();
  ctx.moveTo(-lensOffX - lensW / 2, lensY);
  ctx.lineTo(-lensOffX - lensW, lensY - eyeDist * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lensOffX + lensW / 2, lensY);
  ctx.lineTo(lensOffX + lensW, lensY - eyeDist * 0.1);
  ctx.stroke();

  // === TEXT HIỆU ỨNG ===
  if (Math.floor(time / 4000) % 2 === 0) {
    const alpha = Math.max(0, Math.min(1, Math.sin(time / 800) * 1.5));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700';
    ctx.font = `italic bold ${eyeDist * 0.35}px "Comfortaa"`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText("LUXURY VIBE", 0, -lensH);
    ctx.restore();
  }

  ctx.restore();
}
