import { drawGlasses } from "./glasses.js";
import { drawRabbit } from "./rabbit.js";
import { drawHalo } from "./halo.js";
import { drawCat } from "./cat.js";
import { drawBeauty } from "./beauty.js";

// Hàm vẽ bộ lọc gương mặt AR (Stickers) dựa trên toạ độ mốc MediaPipe FaceLandmarker
export function drawFaceFilter(ctx, landmarks, filterName, canvasWidth, canvasHeight, frameNow = performance.now()) {
  if (!landmarks || landmarks.length === 0 || filterName === 'none') return;

  // 1. Tính toán tâm hai mắt từ các điểm mốc chính xác của MediaPipe
  const getEyeCenter = (indices) => {
    let x = 0, y = 0;
    indices.forEach(idx => {
      if (landmarks[idx]) {
        x += landmarks[idx].x;
        y += landmarks[idx].y;
      }
    });
    return { x: x / indices.length, y: y / indices.length };
  };

  const leftEye = getEyeCenter([33, 133, 159, 145]);
  const rightEye = getEyeCenter([362, 263, 386, 374]);
  
  // Chuyển sang toạ độ pixel trên Canvas
  const leX = leftEye.x * canvasWidth;
  const leY = leftEye.y * canvasHeight;
  const reX = rightEye.x * canvasWidth;
  const reY = rightEye.y * canvasHeight;

  // Tính khoảng cách hai mắt (để tự động phóng to/thu nhỏ sticker theo khoảng cách xa gần)
  const eyeDist = Math.hypot(reX - leX, reY - leY);
  
  // Tính góc nghiêng của đầu (xoay nghiêng sticker theo góc nghiêng mắt)
  const angle = Math.atan2(reY - leY, reX - leX);

  // Điểm mốc đỉnh mũi (index 1)
  const nose = landmarks[1];
  const noseX = nose ? nose.x * canvasWidth : (leX + reX) / 2;
  const noseY = nose ? nose.y * canvasHeight : (leY + reY) / 2 + eyeDist * 0.2;

  // Điểm mốc đỉnh trán (index 10)
  const forehead = landmarks[10];
  const fhX = forehead ? forehead.x * canvasWidth : (leX + reX) / 2;
  const fhY = forehead ? forehead.y * canvasHeight : (leY + reY) / 2 - eyeDist * 0.5;

  // Tạo đối tượng metrics thống nhất để truyền cho các bộ lọc
  const metrics = {
    leX,
    leY,
    reX,
    reY,
    eyeDist,
    angle,
    noseX,
    noseY,
    fhX,
    fhY
  };

  // Điều phối vẽ dựa trên tên bộ lọc (filterName)
  switch (filterName) {
    case 'glasses':
      drawGlasses(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow);
      break;
    case 'rabbit':
      drawRabbit(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow);
      break;
    case 'halo':
      drawHalo(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow);
      break;
    case 'cat':
      drawCat(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow);
      break;
    case 'beauty':
      drawBeauty(ctx, landmarks, metrics, canvasWidth, canvasHeight, frameNow);
      break;
    default:
      break;
  }
}
