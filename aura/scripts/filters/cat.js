// FILTER 4: Mèo Xinh Má Hồng Toàn Diện (Có cử động) 🐱✨
export function drawCat(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;
  const time = performance.now();

  ctx.save();

  // =============================================
  // 1. TAI MÈO (Có nhúc nhích)
  // =============================================
  ctx.save();
  ctx.translate(fhX, fhY);
  ctx.rotate(angle);

  function drawCatEar(xDir) {
    const baseX = xDir * eyeDist * 0.55; // Tăng khoảng cách tai
    const topY = -eyeDist * 0.95;       // Tăng chiều cao tai
    
    // Tai nhúc nhích nhẹ
    const wiggle = Math.sin(time / 500 + xDir) * 0.05;

    ctx.save();
    ctx.translate(baseX, 0);
    ctx.rotate(wiggle);

    // Tai ngoài
    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.moveTo(0, -eyeDist * 0.15);
    ctx.lineTo(xDir * eyeDist * 0.55, -eyeDist * 0.1); // Tăng độ rộng gốc tai
    ctx.lineTo(xDir * eyeDist * 0.15, topY);           // Đỉnh tai nhọn hơn
    ctx.closePath();
    ctx.fill();

    // Tai trong
    ctx.fillStyle = '#ff85a2';
    ctx.beginPath();
    ctx.moveTo(xDir * eyeDist * 0.08, -eyeDist * 0.18);
    ctx.lineTo(xDir * eyeDist * 0.4, -eyeDist * 0.15);
    ctx.lineTo(xDir * eyeDist * 0.15, topY + eyeDist * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawCatEar(-1);
  drawCatEar(1);

  ctx.restore();

  // =============================================
  // 2. MÁ HỒNG (Breathing effect & Large spread)
  // =============================================
  ctx.save();
  const breathingAlpha = 0.25 + Math.sin(time / 1000) * 0.15;
  ctx.shadowBlur = 35;
  ctx.shadowColor = `rgba(255, 140, 190, ${breathingAlpha})`;
  ctx.fillStyle = `rgba(255, 140, 190, ${breathingAlpha})`;

  ctx.beginPath();
  ctx.arc(noseX - eyeDist * 0.65, noseY + eyeDist * 0.05, eyeDist * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(noseX + eyeDist * 0.65, noseY + eyeDist * 0.05, eyeDist * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // =============================================
  // 3. MŨI MÈO (Chóp mũi lấp lánh)
  // =============================================
  ctx.save();
  const noseBrightness = 180 + Math.sin(time / 300) * 40;
  ctx.fillStyle = `rgb(255, ${noseBrightness}, 157)`;
  ctx.beginPath();
  ctx.moveTo(noseX - eyeDist * 0.06, noseY - eyeDist * 0.02);
  ctx.lineTo(noseX + eyeDist * 0.06, noseY - eyeDist * 0.02);
  ctx.lineTo(noseX, noseY + eyeDist * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // =============================================
  // 4. RÂU MÈO (Spring/Inertia Physics)
  // =============================================
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = eyeDist * 0.035;
  ctx.lineCap = 'round';

  const whiskerStartX = eyeDist * 0.18;
  const whiskerBaseY = noseY + eyeDist * 0.03;

  function drawSpringWhiskers(startX, startY, isLeft) {
    const dir = isLeft ? -1 : 1;
    for (let i = 0; i < 3; i++) {
        const angleOffset = (i - 1) * 15; 
        const dynamicWiggle = Math.sin(time / 150 + i * 0.5) * 12; // Rung lệch pha độc lập
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Control point tạo độ cong cho râu với inertia giả lập
        ctx.quadraticCurveTo(
            startX + (eyeDist * 0.5 * dir), startY + angleOffset - 10,
            startX + (eyeDist * 1.1 * dir), startY + angleOffset + dynamicWiggle
        );
        ctx.stroke();
    }
  }

  drawSpringWhiskers(noseX - whiskerStartX, whiskerBaseY, true);
  drawSpringWhiskers(noseX + whiskerStartX, whiskerBaseY, false);
  ctx.restore();

  // =============================================
  // 5. HIỆU ỨNG SPARKLES (Bay quanh má)
  // =============================================
  ctx.save();
  const starCount = 6;
  for (let i = 0; i < starCount; i++) {
    const angleRad = (time / 1000) + (i * Math.PI * 2 / starCount);
    const dist = eyeDist * (0.5 + Math.sin(time / 500 + i) * 0.1);
    const sx = noseX + Math.cos(angleRad) * dist * (i % 2 === 0 ? 1 : -1) * 1.5;
    const sy = noseY + Math.sin(angleRad) * dist * 0.8;
    
    const size = eyeDist * (0.02 + Math.sin(time / 300 + i) * 0.01);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff85a2';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // =============================================
  // 6. ÁNH LONG LANH MẮT kiểu anime
  // =============================================
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';

  const sparkleR = eyeDist * 0.035;

  // Lấp lánh ở góc trên-phải mỗi mắt
  ctx.beginPath();
  ctx.arc(leX + eyeDist * 0.06, leY - eyeDist * 0.06, sparkleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(reX + eyeDist * 0.06, reY - eyeDist * 0.06, sparkleR, 0, Math.PI * 2);
  ctx.fill();

  // Sparkle phụ nhỏ
  const miniR = sparkleR * 0.5;
  ctx.beginPath();
  ctx.arc(leX + eyeDist * 0.1, leY - eyeDist * 0.03, miniR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(reX + eyeDist * 0.1, reY - eyeDist * 0.03, miniR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.restore();
}
