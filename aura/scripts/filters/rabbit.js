// FILTER 2: Tai Thỏ Hồng Xinh Xắn Chi Tiết (Có cử động) 🐰💕
export function drawRabbit(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;
  const time = performance.now();

  ctx.save();

  // =============================================
  // 1. TAI THỎ trên trán (translate + rotate theo góc nghiêng đầu)
  // =============================================
  ctx.save();
  ctx.translate(fhX, fhY);
  ctx.rotate(angle);

  // --- Hàm vẽ một tai thỏ với gradient bên trong ---
  function drawEar(xDir, tiltAngle) {
    const earX = xDir * eyeDist * 0.45; // Đẩy tai ra xa nhau hơn một chút
    const earY = -eyeDist * 1.2;        // Đẩy tai lên cao hơn (xa trán hơn)
    
    // Hiệu ứng tai vẫy/rung nhẹ nhàng tự nhiên
    const wiggle = Math.sin(time / 400 + (xDir > 0 ? 0 : Math.PI)) * 0.08;
    const finalTilt = tiltAngle + wiggle;

    ctx.save();
    ctx.translate(earX, earY);
    ctx.rotate(finalTilt);

    // Hiệu ứng "nhún" tai (co giãn nhẹ)
    const squash = 1 + Math.sin(time / 600) * 0.03;
    ctx.scale(1, squash);

    // Phần tai ngoài: lông trắng mịn
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
    ctx.lineWidth = eyeDist * 0.015;
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeDist * 0.35, eyeDist * 0.95, 0, 0, Math.PI * 2); // Tăng kích thước ellipse
    ctx.fill();
    ctx.stroke();

    // Phần tai trong: gradient hồng tỏa sáng
    const innerGrad = ctx.createRadialGradient(0, 0, eyeDist * 0.02, 0, 0, eyeDist * 0.5);
    innerGrad.addColorStop(0, '#ff69b4');
    innerGrad.addColorStop(0.7, '#ffb3d9');
    innerGrad.addColorStop(1, 'rgba(255, 179, 217, 0.3)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeDist * 0.18, eyeDist * 0.65, 0, 0, Math.PI * 2); // Tăng kích thước ellipse trong
    ctx.fill();

    ctx.restore();
  }

  // Tai trái nghiêng vào trong nhẹ, tai phải đối xứng
  drawEar(-1, -0.15);
  drawEar(1, 0.15);

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
