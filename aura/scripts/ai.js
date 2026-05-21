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
      numHands: 2,
      // Hạ ngưỡng confidence xuống để detect tốt hơn khi 2 tay gần nhau / chồng lấp
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3
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

// === HELPER: Tính khoảng cách và thông tin giữa 2 bàn tay ===
function computeTwoHandsInfo(hand1, hand2, canvasWidth, canvasHeight) {
  const getDistance = (pt1, pt2) => {
    const dx = pt1.x - pt2.x;
    const dy = pt1.y - pt2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getHandScale = (hand) => {
    const palmHeight = getDistance(hand[0], hand[9]);
    const palmWidth = getDistance(hand[5], hand[17]);
    return Math.max(palmHeight, palmWidth, 0.001);
  };

  const getPalmCenter = (hand) => {
    const anchors = [0, 5, 9, 13, 17];
    const sum = anchors.reduce((acc, index) => {
      acc.x += hand[index].x;
      acc.y += hand[index].y;
      return acc;
    }, { x: 0, y: 0 });
    return { x: sum.x / anchors.length, y: sum.y / anchors.length };
  };

  const scale = (getHandScale(hand1) + getHandScale(hand2)) / 2;
  const center1 = getPalmCenter(hand1);
  const center2 = getPalmCenter(hand2);
  const centerDist = getDistance(center1, center2);

  // Khi chắp tay, hai bàn tay thường bị MediaPipe lật hoặc mất một phần landmark.
  // Vì vậy lấy các cặp gần nhất giữa cụm lòng bàn tay thay vì so cùng index cứng.
  const palmAnchors = [0, 1, 5, 9, 13, 17];
  const nearestDistances = palmAnchors.map((index1) => {
    return Math.min(...palmAnchors.map((index2) => getDistance(hand1[index1], hand2[index2])));
  }).sort((a, b) => a - b);
  const closePalmDist = nearestDistances.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;

  // Điểm gần tay: center giữ ổn định, closePalm giúp nhận chắp tay trước khi 1 tay bị mất detect.
  const normalizedDist = scale > 0 ? ((centerDist * 0.65) + (closePalmDist * 0.35)) / scale : 999;

  // Tâm giữa 2 bàn tay (pixel)
  const midX = ((center1.x + center2.x) / 2) * canvasWidth;
  const midY = ((center1.y + center2.y) / 2) * canvasHeight;

  return { normalizedDist, midX, midY };
}

// === THUẬT TOÁN NHẬN DIỆN CỬ CHỈ CHẮP TAY (CÓ DỰ ĐOÁN) ===
export function analyzeHands(handResults, canvasWidth, canvasHeight, showToastCallback) {
  initDomRefs();
  const detectedCount = handResults.landmarks ? handResults.landmarks.length : 0;
  const now = performance.now();

  if (statHands) {
    statHands.innerText = `${detectedCount}/2`;
  }

  // ============================================================
  // TRƯỜNG HỢP 1: Detect được đủ 2 tay — Thuật toán chuẩn
  // ============================================================
  if (detectedCount >= 2) {
    const hand1 = handResults.landmarks[0];
    const hand2 = handResults.landmarks[1];
    const info = computeTwoHandsInfo(hand1, hand2, canvasWidth, canvasHeight);

    state.distanceNormalized = info.normalizedDist;
    if (statDist) statDist.innerText = info.normalizedDist.toFixed(2);

    // Luôn cập nhật lịch sử 2 tay mỗi frame (để bộ dự đoán dùng khi mất detect)
    state.lastTwoHandsTime = now;
    state.lastTwoHandsDist = info.normalizedDist;
    state.lastTwoHandsMidX = info.midX;
    state.lastTwoHandsMidY = info.midY;
    state.lastHandsDetected = 2;

    // So sánh ngưỡng kích hoạt chắp tay
    if (info.normalizedDist < state.sensitivityThreshold) {
      activateGesture(info.midX, info.midY, canvasWidth, canvasHeight, showToastCallback);
    } else if (info.normalizedDist > (state.sensitivityThreshold + 0.10)) {
      deactivateGesture();
    }
    return;
  }

  // ============================================================
  // TRƯỜNG HỢP 2: Chỉ detect được 0 hoặc 1 tay
  // → Kiểm tra xem có phải MediaPipe bị mất detect do 2 tay chồng nhau không
  // ============================================================
  const timeSinceLastTwoHands = now - state.lastTwoHandsTime;
  const wasRecentlyTwoHands = timeSinceLastTwoHands < state.predictionWindowMs;
  const wereHandsClose = state.lastTwoHandsDist < (state.sensitivityThreshold + 0.25);

  if (detectedCount === 1 && wasRecentlyTwoHands && wereHandsClose) {
    // ĐÂY LÀ TÌNH HUỐNG CHÍNH CẦN XỬ LÝ:
    // Vừa mới thấy 2 tay rất gần nhau → đột ngột chỉ còn 1 tay
    // → Suy luận: 2 tay đã chạm/chồng nhau, MediaPipe mất detect 1 tay
    // → Kích hoạt hào quang với toạ độ gần nhất đã biết!
    console.log(`[AuraAI] Dự đoán chắp tay! dist=${state.lastTwoHandsDist.toFixed(2)}, elapsed=${timeSinceLastTwoHands.toFixed(0)}ms`);

    if (statDist) statDist.innerText = state.lastTwoHandsDist.toFixed(2) + " ⚡";

    activateGesture(
      state.lastTwoHandsMidX,
      state.lastTwoHandsMidY,
      canvasWidth,
      canvasHeight,
      showToastCallback
    );

    // Duy trì hiệu ứng lấp lánh khi chỉ detect 1 tay (tay vẫn đang chắp)
    if (state.gestureActive) {
      state.continuousSparkleTimer++;
      if (state.continuousSparkleTimer % 3 === 0) {
        // Dùng vị trí tay detect được hiện tại thay vì vị trí cũ
        const singleHand = handResults.landmarks[0];
        const hx = singleHand[9].x * canvasWidth;
        const hy = singleHand[9].y * canvasHeight;
        state.particles.push(
          new Particle(
            hx + (Math.random() - 0.5) * 40,
            hy + (Math.random() - 0.5) * 40,
            state.activePreset,
            canvasWidth,
            canvasHeight
          )
        );
      }
    }
    return;
  }

  // ============================================================
  // TRƯỜNG HỢP 3: Không có tay nào, hoặc 1 tay nhưng không gần nhau gần đây
  // → Reset trạng thái
  // ============================================================
  state.distanceNormalized = 999;
  if (statDist) statDist.innerText = "--";
  state.lastHandsDetected = detectedCount;

  // Chỉ deactivate nếu đã qua cửa sổ dự đoán (tránh nhấp nháy)
  if (!wasRecentlyTwoHands) {
    deactivateGesture();
  }
}

// Kích hoạt cử chỉ chắp tay (chống gọi lặp nếu đã active)
function activateGesture(midX, midY, canvasWidth, canvasHeight, showToastCallback) {
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
}

// Tắt cử chỉ chắp tay
function deactivateGesture() {
  if (state.gestureActive) {
    state.gestureActive = false;
    if (gestureInstruction) gestureInstruction.classList.remove('hidden');
  }
}
