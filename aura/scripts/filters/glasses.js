// FILTER 1: Kính Phi Công Aviator Cao Cấp 😎✨
export function drawGlasses(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle } = metrics;

  // Trọng tâm nằm ở trung điểm 2 mắt
  const midX = (leX + reX) / 2;
  const midY = (leY + reY) / 2;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  // === KÍCH THƯỚC TỔNG THỂ tỉ lệ theo khoảng cách hai mắt ===
  const lensW = eyeDist * 0.52;   // Chiều rộng nửa tròng kính
  const lensH = eyeDist * 0.48;   // Chiều cao tròng kính
  const lensOffX = eyeDist * 0.52; // Khoảng cách tâm tròng so với trung tâm
  const lensY = eyeDist * 0.02;    // Offset dọc nhẹ xuống dưới

  // --- Hàm vẽ tròng kính Aviator cong mượt bằng Bezier ---
  function drawAviatorLens(cx, cy) {
    ctx.beginPath();
    // Đỉnh trên tròng kính
    ctx.moveTo(cx, cy - lensH * 0.45);
    // Cạnh phải trên - cong ra ngoài (đặc trưng Aviator)
    ctx.bezierCurveTo(
      cx + lensW * 0.6, cy - lensH * 0.48,
      cx + lensW * 0.95, cy - lensH * 0.25,
      cx + lensW * 0.9, cy + lensH * 0.05
    );
    // Cạnh phải dưới - thu hẹp kiểu giọt nước
    ctx.bezierCurveTo(
      cx + lensW * 0.88, cy + lensH * 0.35,
      cx + lensW * 0.55, cy + lensH * 0.55,
      cx, cy + lensH * 0.5
    );
    // Cạnh trái dưới - đối xứng
    ctx.bezierCurveTo(
      cx - lensW * 0.55, cy + lensH * 0.55,
      cx - lensW * 0.88, cy + lensH * 0.35,
      cx - lensW * 0.9, cy + lensH * 0.05
    );
    // Cạnh trái trên - quay về đỉnh
    ctx.bezierCurveTo(
      cx - lensW * 0.95, cy - lensH * 0.25,
      cx - lensW * 0.6, cy - lensH * 0.48,
      cx, cy - lensH * 0.45
    );
    ctx.closePath();
  }

  // === VẼ TRÒNG KÍNH TRÁI ===
  const leftCx = -lensOffX;
  const leftCy = lensY;

  // Tô gradient kính râm tối: trên đậm, dưới nhạt hơn cho chân thực
  drawAviatorLens(leftCx, leftCy);
  const leftGrad = ctx.createLinearGradient(leftCx, leftCy - lensH * 0.45, leftCx, leftCy + lensH * 0.5);
  leftGrad.addColorStop(0, '#1a1a2e');
  leftGrad.addColorStop(0.6, '#2d2d44');
  leftGrad.addColorStop(1, '#3a3a55');
  ctx.fillStyle = leftGrad;
  ctx.fill();

  // Viền khung kim loại mỏng sáng bóng
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = eyeDist * 0.025;
  ctx.stroke();

  // Hiệu ứng phản quang: vệt sáng trắng mờ cong trên nửa trên tròng kính
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(leftCx + lensW * 0.1, leftCy - lensH * 0.15, lensW * 0.55, lensH * 0.18, -0.15, Math.PI, 0);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = eyeDist * 0.035;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // === VẼ TRÒNG KÍNH PHẢI (đối xứng) ===
  const rightCx = lensOffX;
  const rightCy = lensY;

  drawAviatorLens(rightCx, rightCy);
  const rightGrad = ctx.createLinearGradient(rightCx, rightCy - lensH * 0.45, rightCx, rightCy + lensH * 0.5);
  rightGrad.addColorStop(0, '#1a1a2e');
  rightGrad.addColorStop(0.6, '#2d2d44');
  rightGrad.addColorStop(1, '#3a3a55');
  ctx.fillStyle = rightGrad;
  ctx.fill();

  ctx.strokeStyle = '#888888';
  ctx.lineWidth = eyeDist * 0.025;
  ctx.stroke();

  // Phản quang tròng phải
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(rightCx + lensW * 0.1, rightCy - lensH * 0.15, lensW * 0.55, lensH * 0.18, -0.15, Math.PI, 0);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = eyeDist * 0.035;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // === CẦU NỐI GIỮA HAI TRÒNG KÍNH (Bridge) ===
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = eyeDist * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(leftCx + lensW * 0.85, leftCy - lensH * 0.1);
  ctx.quadraticCurveTo(0, leftCy - lensH * 0.35, rightCx - lensW * 0.85, rightCy - lensH * 0.1);
  ctx.stroke();

  // === CÀNG KÍNH (Temple Arms) kéo dài ra hai bên tai ===
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = eyeDist * 0.028;
  ctx.lineCap = 'round';

  // Càng trái
  ctx.beginPath();
  ctx.moveTo(leftCx - lensW * 0.88, leftCy - lensH * 0.05);
  ctx.quadraticCurveTo(
    leftCx - lensW * 1.3, leftCy - lensH * 0.15,
    leftCx - lensW * 1.5, leftCy + lensH * 0.1
  );
  ctx.stroke();

  // Càng phải
  ctx.beginPath();
  ctx.moveTo(rightCx + lensW * 0.88, rightCy - lensH * 0.05);
  ctx.quadraticCurveTo(
    rightCx + lensW * 1.3, rightCy - lensH * 0.15,
    rightCx + lensW * 1.5, rightCy + lensH * 0.1
  );
  ctx.stroke();

  ctx.restore();
}
