// FILTER 1: Kính Ngầu Thug Life 😎
export function drawGlasses(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { leX, leY, reX, reY, eyeDist, angle } = metrics;
  
  // Trọng tâm nằm ở trung điểm 2 mắt
  const midX = (leX + reX) / 2;
  const midY = (leY + reY) / 2;
  
  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const w = eyeDist * 2.2;
  const h = eyeDist * 0.65;

  ctx.fillStyle = '#000000';
  // Tròng kính chữ nhật màu đen cực ngầu
  ctx.fillRect(-w * 0.46, -h * 0.35, w * 0.38, h * 0.7);
  ctx.fillRect(w * 0.08, -h * 0.35, w * 0.38, h * 0.7);
  // Cầu nối giữa 2 tròng kính
  ctx.fillRect(-w * 0.08, -h * 0.1, w * 0.16, h * 0.2);

  // Hiệu ứng phản quang pixel trắng chéo đặc trưng
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w * 0.36, -h * 0.2, w * 0.07, h * 0.4);
  ctx.fillRect(-w * 0.23, -h * 0.05, w * 0.04, h * 0.2);
  ctx.fillRect(w * 0.18, -h * 0.2, w * 0.07, h * 0.4);
  ctx.fillRect(w * 0.31, -h * 0.05, w * 0.04, h * 0.2);

  ctx.restore();
}
