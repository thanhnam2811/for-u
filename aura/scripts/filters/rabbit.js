// FILTER 2: Tai Thỏ Hồng Xinh Xắn 🐰
export function drawRabbit(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, fhX, fhY } = metrics;

  ctx.save();
  ctx.translate(fhX, fhY);
  ctx.rotate(angle);

  // Tai Thỏ Trái (Phần lông trắng bên ngoài)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-eyeDist * 0.35, -eyeDist * 0.9, eyeDist * 0.22, eyeDist * 0.65, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Tai Thỏ Trái (Phần tai hồng bên trong)
  ctx.fillStyle = '#ffb3d9';
  ctx.beginPath();
  ctx.ellipse(-eyeDist * 0.35, -eyeDist * 0.9, eyeDist * 0.11, eyeDist * 0.45, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Tai Thỏ Phải (Phần lông trắng bên ngoài)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(eyeDist * 0.35, -eyeDist * 0.9, eyeDist * 0.22, eyeDist * 0.65, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Tai Thỏ Phải (Phần tai hồng bên trong)
  ctx.fillStyle = '#ffb3d9';
  ctx.beginPath();
  ctx.ellipse(eyeDist * 0.35, -eyeDist * 0.9, eyeDist * 0.11, eyeDist * 0.45, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
