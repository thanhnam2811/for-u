// Nạp thư viện MediaPipe Hand Landmarker qua CDN ES Module
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
import { state } from "./state.js";
import { THEME_COLORS } from "./constants.js";
import { Particle, triggerAuraEffects } from "./canvas-effects.js";

// DOM references
let progressBar = null;
let loadingScreen = null;
let loadingStatus = null;
let statHands = null;
let statDist = null;
let gestureInstruction = null;

function initDomRefs() {
  if (!progressBar) progressBar = document.getElementById('progress-bar');
  if (!loadingScreen) loadingScreen = document.getElementById('loading-screen');
  if (!loadingStatus) loadingStatus = document.getElementById('loading-status');
  if (!statHands) statHands = document.getElementById('stat-hands');
  if (!statDist) statDist = document.getElementById('stat-dist');
  if (!gestureInstruction) gestureInstruction = document.getElementById('gesture-instruction');
}

// Tải mô hình AI từ CDN
export async function loadHandLandmarkerModel() {
  initDomRefs();
  if (loadingStatus) loadingStatus.innerText = "Đang tải thư viện nhận diện AI...";
  if (progressBar) progressBar.style.width = "30%";

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );
    
    if (progressBar) progressBar.style.width = "60%";
    if (loadingStatus) loadingStatus.innerText = "Đang cấu hình mô hình hiệu ứng...";

    state.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2 // Nhận diện tối đa 2 tay để làm cử chỉ chắp tay
    });

    if (progressBar) progressBar.style.width = "100%";
    if (loadingStatus) loadingStatus.innerText = "Hoàn thành! Đang bắt đầu khởi động...";
    console.log("Khởi tạo MediaPipe HandLandmarker thành công!");
    
    state.isModelLoaded = true;
    
    // Ẩn màn hình tải sau khi hoàn tất
    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add('hidden');
    }, 800);
    
  } catch (err) {
    console.error("Lỗi khi tải mô hình MediaPipe:", err);
    if (loadingStatus) {
      loadingStatus.innerText = "Lỗi khi nạp mô hình AI. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.";
    }
    if (progressBar) progressBar.style.backgroundColor = "#ff4d4d";
  }
}

// Vẽ bộ khung xương tay AI bằng hiệu ứng neon
export function drawHandSkeleton(ctx, landmarks, isRightHand, canvasWidth, canvasHeight) {
  ctx.save();
  // Màu sắc khung xương đổi theo chủ đề Hào Quang đang chọn
  const theme = THEME_COLORS[state.activePreset];
  ctx.strokeStyle = isRightHand ? theme.primary : theme.secondary;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  
  // Vầng phát sáng neon
  ctx.shadowBlur = 10;
  ctx.shadowColor = ctx.strokeStyle;

  // Bản đồ kết nối các khớp xương bàn tay
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Ngón cái
    [0, 5], [5, 6], [6, 7], [7, 8], // Ngón trỏ
    [5, 9], [9, 10], [10, 11], [11, 12], // Ngón giữa
    [9, 13], [13, 14], [14, 15], [15, 16], // Ngón áp út
    [13, 17], [17, 18], [18, 19], [19, 20], // Ngón út
    [0, 17] // Khớp lòng bàn tay dưới
  ];

  // Vẽ các nét nối khớp xương
  connections.forEach(([i, j]) => {
    const pt1 = landmarks[i];
    const pt2 = landmarks[j];
    
    ctx.beginPath();
    ctx.moveTo(pt1.x * canvasWidth, pt1.y * canvasHeight);
    ctx.lineTo(pt2.x * canvasWidth, pt2.y * canvasHeight);
    ctx.stroke();
  });

  // Vẽ các hạt sáng nhỏ lấp lánh đầu khớp ngón
  ctx.fillStyle = '#ffffff';
  landmarks.forEach((pt, index) => {
    ctx.beginPath();
    const size = [4, 8, 12, 16, 20].includes(index) ? 5 : 3;
    ctx.arc(pt.x * canvasWidth, pt.y * canvasHeight, size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// Phân tích và phát hiện cử chỉ chắp tay (Pray gesture)
export function analyzeHands(handResults, canvasWidth, canvasHeight, showToastCallback) {
  initDomRefs();
  const detectedCount = handResults.landmarks ? handResults.landmarks.length : 0;
  
  if (statHands) {
    statHands.innerText = `${detectedCount}/2`;
  }
  
  if (detectedCount < 2) {
    state.distanceNormalized = 999;
    if (statDist) statDist.innerText = "--";
    
    if (state.gestureActive) {
      state.gestureActive = false;
      if (gestureInstruction) gestureInstruction.classList.remove('hidden');
    }
    return;
  }

  // Có đủ 2 tay trên màn hình
  const hand1 = handResults.landmarks[0];
  const hand2 = handResults.landmarks[1];

  // 1. Tính kích thước lòng bàn tay để chuẩn hóa tỷ lệ xa/gần
  const getHandScale = (hand) => {
    const dx = hand[9].x - hand[0].x;
    const dy = hand[9].y - hand[0].y;
    return Math.sqrt(dx*dx + dy*dy);
  };
  const scale = (getHandScale(hand1) + getHandScale(hand2)) / 2;

  // 2. Tính khoảng cách giữa các điểm khớp quan trọng của 2 bàn tay
  const getDistance = (pt1, pt2) => {
    const dx = pt1.x - pt2.x;
    const dy = pt1.y - pt2.y;
    return Math.sqrt(dx*dx + dy*dy);
  };

  const distWrist = getDistance(hand1[0], hand2[0]);
  const distIndex = getDistance(hand1[5], hand2[5]);
  const distPinky = getDistance(hand1[17], hand2[17]);

  // Khoảng cách trung bình
  const avgDistance = (distWrist + distIndex + distPinky) / 3;

  // 3. Chuẩn hóa khoảng cách (loại bỏ sai số xa/gần camera)
  state.distanceNormalized = avgDistance / scale;
  if (statDist) {
    statDist.innerText = state.distanceNormalized.toFixed(2);
  }

  // Tâm phát hào quang (giữa 2 bàn tay)
  const midX = ((hand1[9].x + hand2[9].x) / 2) * canvasWidth;
  const midY = ((hand1[9].y + hand2[9].y) / 2) * canvasHeight;

  // 4. Ngưỡng kích hoạt chắp tay
  if (state.distanceNormalized < state.sensitivityThreshold) {
    if (!state.gestureActive) {
      state.gestureActive = true;
      triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, showToastCallback);
    } else {
      // Tiếp tục duy trì chắp tay -> rơi nhẹ vài hạt bụi lấp lánh
      state.continuousSparkleTimer++;
      if (state.continuousSparkleTimer % 2 === 0) {
        state.particles.push(
          new Particle(
            midX + (Math.random() - 0.5) * 40,
            midY + (Math.random() - 0.5) * 40,
            state.activePreset,
            canvasWidth,
            canvasHeight
          )
        );
      }
    }
  } else if (state.distanceNormalized > (state.sensitivityThreshold + 0.10)) {
    // Tách tay hẳn (áp dụng trễ trượt để chống nhiễu lặp)
    if (state.gestureActive) {
      state.gestureActive = false;
      if (gestureInstruction) gestureInstruction.classList.remove('hidden');
    }
  }
}
