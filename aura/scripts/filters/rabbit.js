// FILTER 2: Tai Thỏ Hồng Xinh Xắn Chi Tiết 🐰💕
export function drawRabbit(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;

  ctx.save();

  // =============================================
  // 1. TAI THỎ trên trán (translate + rotate theo góc nghiêng đầu)
  // =============================================
  ctx.save();
  ctx.translate(fhX, fhY);
  ctx.rotate(angle);

  // --- Hàm vẽ một tai thỏ với gradient bên trong ---
  function drawEar(xDir, tiltAngle) {
    const earX = xDir * eyeDist * 0.35;
    const earY = -eyeDist * 0.9;

    // Phần tai ngoài: lông trắng mịn, viền xám nhẹ tạo chiều sâu
    ctx.save();
    ctx.translate(earX, earY);
    ctx.rotate(tiltAngle);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
    ctx.lineWidth = eyeDist * 0.015;
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeDist * 0.24, eyeDist * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Phần tai trong: gradient hồng tỏa sáng từ tâm ra rìa
    const innerGrad = ctx.createRadialGradient(0, 0, eyeDist * 0.02, 0, 0, eyeDist * 0.45);
    innerGrad.addColorStop(0, '#ff69b4');    // Hồng đậm tâm
    innerGrad.addColorStop(0.7, '#ffb3d9');  // Hồng nhạt rìa
    innerGrad.addColorStop(1, 'rgba(255, 179, 217, 0.3)'); // Mờ dần
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeDist * 0.12, eyeDist * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Tai trái nghiêng vào trong nhẹ, tai phải đối xứng
  drawEar(-1, -0.15);
  drawEar(1, 0.15);

  ctx.restore(); // Kết thúc phần tai (trán)

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
