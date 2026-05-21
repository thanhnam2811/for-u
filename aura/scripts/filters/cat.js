// FILTER 4: Mèo Xinh Má Hồng Toàn Diện 🐱✨
export function drawCat(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle, noseX, noseY, fhX, fhY } = metrics;

  ctx.save();

  // =============================================
  // 1. TAI MÈO tam giác nhọn trên đỉnh đầu
  // =============================================
  ctx.save();
  ctx.translate(fhX, fhY);
  ctx.rotate(angle);

  // --- Hàm vẽ một tai mèo (tam giác ngoài + tam giác hồng trong) ---
  function drawCatEar(xDir) {
    const baseX = xDir * eyeDist * 0.45;
    const topY = -eyeDist * 0.75;

    // Tai ngoài: tam giác đậm màu lông mèo
    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.moveTo(baseX, -eyeDist * 0.15);                       // Gốc trong
    ctx.lineTo(baseX + xDir * eyeDist * 0.45, -eyeDist * 0.1); // Gốc ngoài
    ctx.lineTo(baseX + xDir * eyeDist * 0.12, topY);           // Đỉnh tai
    ctx.closePath();
    ctx.fill();

    // Tai trong: tam giác hồng nhỏ hơn ở bên trong
    ctx.fillStyle = '#ff85a2';
    ctx.beginPath();
    ctx.moveTo(baseX + xDir * eyeDist * 0.05, -eyeDist * 0.18);
    ctx.lineTo(baseX + xDir * eyeDist * 0.35, -eyeDist * 0.15);
    ctx.lineTo(baseX + xDir * eyeDist * 0.12, topY + eyeDist * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  drawCatEar(-1); // Tai trái
  drawCatEar(1);  // Tai phải

  ctx.restore(); // Kết thúc phần tai

  // =============================================
  // 2. MÁ HỒNG LỚN mềm mại (phủ rộng để che khuyết điểm)
  // =============================================
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(255, 140, 190, 0.5)';
  ctx.fillStyle = 'rgba(255, 140, 190, 0.4)';

  // Má trái - bán kính lớn + shadow blur mạnh tạo viền mờ mộng mơ
  ctx.beginPath();
  ctx.arc(noseX - eyeDist * 0.58, noseY, eyeDist * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Má phải
  ctx.beginPath();
  ctx.arc(noseX + eyeDist * 0.58, noseY, eyeDist * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // =============================================
  // 3. MŨI MÈO tam giác hồng chúc xuống
  // =============================================
  ctx.save();
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  // Tam giác nhỏ chúc xuống đặt tại đầu mũi
  ctx.moveTo(noseX - eyeDist * 0.06, noseY - eyeDist * 0.02);
  ctx.lineTo(noseX + eyeDist * 0.06, noseY - eyeDist * 0.02);
  ctx.lineTo(noseX, noseY + eyeDist * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // =============================================
  // 4. RÂU MÈO CONG bằng đường cong Bezier (không thẳng!)
  // =============================================
  ctx.save();
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = eyeDist * 0.03;
  ctx.lineCap = 'round';

  // Toạ độ gốc râu hai bên mũi
  const whiskerStartX = eyeDist * 0.18;
  const whiskerBaseY = noseY + eyeDist * 0.03;

  // Cấu hình 3 râu mỗi bên: [góc Y offset, độ cong control point]
  const whiskerConfigs = [
    { yOff: -eyeDist * 0.06, cpY: -eyeDist * 0.12 },  // Râu trên
    { yOff: 0,                cpY: -eyeDist * 0.02 },  // Râu giữa
    { yOff: eyeDist * 0.06,   cpY: eyeDist * 0.08 },   // Râu dưới
  ];

  whiskerConfigs.forEach(({ yOff, cpY }) => {
    // Râu trái: cong ra ngoài trái
    ctx.beginPath();
    ctx.moveTo(noseX - whiskerStartX, whiskerBaseY + yOff);
    ctx.quadraticCurveTo(
      noseX - eyeDist * 0.55, whiskerBaseY + cpY,
      noseX - eyeDist * 0.85, whiskerBaseY + yOff - eyeDist * 0.02
    );
    ctx.stroke();

    // Râu phải: cong ra ngoài phải (đối xứng)
    ctx.beginPath();
    ctx.moveTo(noseX + whiskerStartX, whiskerBaseY + yOff);
    ctx.quadraticCurveTo(
      noseX + eyeDist * 0.55, whiskerBaseY + cpY,
      noseX + eyeDist * 0.85, whiskerBaseY + yOff - eyeDist * 0.02
    );
    ctx.stroke();
  });

  ctx.restore();

  // =============================================
  // 5. ÁNH LONG LANH MẮT kiểu anime (sparkle trắng phát sáng)
  // =============================================
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';

  const sparkleR = eyeDist * 0.035;

  // Lấp lánh ở góc trên-phải mỗi mắt
  // Mắt trái
  ctx.beginPath();
  ctx.arc(leX + eyeDist * 0.06, leY - eyeDist * 0.06, sparkleR, 0, Math.PI * 2);
  ctx.fill();

  // Mắt phải
  ctx.beginPath();
  ctx.arc(reX + eyeDist * 0.06, reY - eyeDist * 0.06, sparkleR, 0, Math.PI * 2);
  ctx.fill();

  // Sparkle phụ nhỏ hơn bên cạnh mỗi sparkle chính
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
