import { state } from "../state.js";
import { THEME_COLORS } from "../constants.js";

// FILTER 3: Vòng Thiên Thần Neon Lơ Lửng 👼
export function drawHalo(ctx, landmarks, metrics, canvasWidth, canvasHeight) {
  const { eyeDist, angle, fhX, fhY } = metrics;

  // Hiệu ứng nhấp nhô nhẹ nhàng bằng hàm Math.sin theo thời gian thực
  const hoverY = fhY - eyeDist * 0.7 + Math.sin(performance.now() / 250) * eyeDist * 0.12;

  ctx.save();
  ctx.translate(fhX, hoverY);
  ctx.rotate(angle + 0.05);

  const theme = THEME_COLORS[state.activePreset];

  // Vẽ vòng hào quang phát sáng neon đồng bộ theo preset màu đã chọn
  ctx.shadowBlur = 25;
  ctx.shadowColor = theme.primary;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = eyeDist * 0.08;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.ellipse(0, 0, eyeDist * 0.75, eyeDist * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Các hạt bụi sao phát sáng chuyển động xoay tròn nhẹ xung quanh vòng
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 12;
  const time = performance.now() / 450;
  for (let i = 0; i < 3; i++) {
    const spAngle = time + (i * Math.PI * 2 / 3);
    const px = Math.cos(spAngle) * eyeDist * 0.85;
    const py = Math.sin(spAngle) * eyeDist * 0.28;
    ctx.beginPath();
    ctx.arc(px, py, eyeDist * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
