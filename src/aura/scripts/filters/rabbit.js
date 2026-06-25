// FILTER 2: Tai Thỏ Hữu Cơ (Bezier Curves + Squash & Stretch) 🐰💕
export function drawRabbit(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow = performance.now()) {
  const { eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;
  const time = frameNow * 0.005;

  ctx.save();

  // =============================================
  // 1. TAI THỎ (Organic Bezier Motion)
  // =============================================
  ctx.save();
  ctx.translate(fhX, fhY);
  ctx.rotate(angle);

  function drawOrganicEar(xDir, baseOffset) {
    const wiggle = Math.sin(time + (xDir > 0 ? 0 : Math.PI)) * 15; // Biên độ rung
    const squash = 1 + Math.cos(time * 1.5) * 0.05; // Tỷ lệ co giãn y

    ctx.save();
    ctx.translate(xDir * eyeDist * 0.45, -eyeDist * 0.3);
    ctx.scale(1, squash);

    // Vẽ tai ngoài bằng Bezier cho mềm mại
    ctx.beginPath();
    ctx.moveTo(-eyeDist * 0.15, 0);
    // Điểm kiểm soát curve thay đổi dựa trên wiggle tạo cảm giác tai bị bẻ cong
    ctx.bezierCurveTo(
      -eyeDist * 0.35, -eyeDist * 0.5 + wiggle,
      -eyeDist * 0.1, -eyeDist * 1.1 + wiggle,
      0, -eyeDist * 1.3 + wiggle * 0.5
    );
    ctx.bezierCurveTo(
      eyeDist * 0.1, -eyeDist * 1.1 + wiggle,
      eyeDist * 0.35, -eyeDist * 0.5 + wiggle,
      eyeDist * 0.15, 0
    );
    ctx.closePath();
    
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
    ctx.lineWidth = eyeDist * 0.02;
    ctx.fill();
    ctx.stroke();

    // Vẽ lòng tai màu hồng (phiên bản thu nhỏ)
    ctx.beginPath();
    ctx.moveTo(-eyeDist * 0.08, -eyeDist * 0.05);
    ctx.bezierCurveTo(
      -eyeDist * 0.2, -eyeDist * 0.4 + wiggle,
      -eyeDist * 0.05, -eyeDist * 0.8 + wiggle,
      0, -eyeDist * 0.9 + wiggle * 0.5
    );
    ctx.bezierCurveTo(
      eyeDist * 0.05, -eyeDist * 0.8 + wiggle,
      eyeDist * 0.2, -eyeDist * 0.4 + wiggle,
      eyeDist * 0.08, -eyeDist * 0.05
    );
    const innerGrad = ctx.createRadialGradient(0, -eyeDist * 0.4, 0, 0, -eyeDist * 0.4, eyeDist * 0.6);
    innerGrad.addColorStop(0, '#ffb3d9');
    innerGrad.addColorStop(1, '#ff69b4');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.restore();
  }

  drawOrganicEar(-1);
  drawOrganicEar(1);
  ctx.restore();

  // =============================================
  // 2. MÁ HỒNG PHẤN mềm mại (giúp che khuyết điểm da)
  // =============================================
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(255, 130, 180, 0.4)';
  ctx.fillStyle = 'rgba(255, 130, 180, 0.35)';

  // Má trái
  ctx.beginPath();
  ctx.arc(noseX - eyeDist * 0.6, noseY + eyeDist * 0.1, eyeDist * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Má phải
  ctx.beginPath();
  ctx.arc(noseX + eyeDist * 0.6, noseY + eyeDist * 0.1, eyeDist * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // =============================================
  // 3. MŨI THỎ nhỏ nhắn hồng xinh trên đầu mũi
  // =============================================
  ctx.save();
  ctx.fillStyle = '#ff85a2';

  // Hình oval ngang nhỏ đặt ở đỉnh mũi
  ctx.beginPath();
  ctx.ellipse(noseX, noseY, eyeDist * 0.07, eyeDist * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Đường sẻ mũi thỏ dọc xuống dưới
  ctx.strokeStyle = '#ff85a2';
  ctx.lineWidth = eyeDist * 0.02;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(noseX, noseY + eyeDist * 0.05);
  ctx.lineTo(noseX, noseY + eyeDist * 0.1);
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}
