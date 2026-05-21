// FILTER 4: Má Hồng Râu Mèo Dễ Thương 🐱
export function drawCat(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, noseX, noseY } = metrics;

  ctx.save();
  ctx.translate(noseX, noseY);
  ctx.rotate(angle);

  // 1. Vẽ vòng phấn má hồng mềm mại mờ nhẹ 2 bên má
  ctx.fillStyle = 'rgba(255, 126, 187, 0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(255, 126, 187, 0.5)';
  
  ctx.beginPath();
  ctx.arc(-eyeDist * 0.55, -eyeDist * 0.05, eyeDist * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeDist * 0.55, -eyeDist * 0.05, eyeDist * 0.28, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0; // Tắt shadow để vẽ râu chi tiết sắc nét

  // 2. Mũi mèo nhỏ nhắn hình trái tim hồng
  ctx.fillStyle = '#ff7ebb';
  ctx.beginPath();
  ctx.arc(-eyeDist * 0.05, -eyeDist * 0.05, eyeDist * 0.07, 0, Math.PI * 2);
  ctx.arc(eyeDist * 0.05, -eyeDist * 0.05, eyeDist * 0.07, 0, Math.PI * 2);
  ctx.lineTo(0, eyeDist * 0.05);
  ctx.closePath();
  ctx.fill();

  // 3. Ba chiếc râu mèo mảnh màu đen mỗi bên má
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = eyeDist * 0.04;
  ctx.lineCap = 'round';

  // Râu mèo bên trái
  ctx.beginPath();
  ctx.moveTo(-eyeDist * 0.35, -eyeDist * 0.05);
  ctx.lineTo(-eyeDist * 0.8, -eyeDist * 0.12);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(-eyeDist * 0.35, 0);
  ctx.lineTo(-eyeDist * 0.85, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-eyeDist * 0.35, eyeDist * 0.05);
  ctx.lineTo(-eyeDist * 0.8, eyeDist * 0.12);
  ctx.stroke();

  // Râu mèo bên phải
  ctx.beginPath();
  ctx.moveTo(eyeDist * 0.35, -eyeDist * 0.05);
  ctx.lineTo(eyeDist * 0.8, -eyeDist * 0.12);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(eyeDist * 0.35, 0);
  ctx.lineTo(eyeDist * 0.85, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(eyeDist * 0.35, eyeDist * 0.05);
  ctx.lineTo(eyeDist * 0.8, eyeDist * 0.12);
  ctx.stroke();

  ctx.restore();
}
