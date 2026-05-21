// Nạp thư viện MediaPipe qua CDN ES Module
import { FilesetResolver, HandLandmarker, ImageSegmenter, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
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

async function createHandLandmarker(vision, delegate = "GPU") {
  const baseOptions = {
    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
  };

  if (delegate) baseOptions.delegate = delegate;

  return HandLandmarker.createFromOptions(vision, {
    baseOptions,
    runningMode: "VIDEO",
    numHands: 2,
    // Hạ ngưỡng confidence xuống để detect tốt hơn khi 2 tay gần nhau / chồng lấp
    minHandDetectionConfidence: 0.3,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3
  });
}

async function createFaceLandmarker(vision, delegate = "GPU") {
  const baseOptions = {
    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
  };

  if (delegate) baseOptions.delegate = delegate;

  return FaceLandmarker.createFromOptions(vision, {
    baseOptions,
    runningMode: "VIDEO",
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false
  });
}

// Tải mô hình AI từ CDN
export async function loadHandLandmarkerModel() {
  initDomRefs();
  if (loadingStatus) loadingStatus.innerText = "Đang tải thư viện nhận diện AI...";
  if (progressBar) progressBar.style.width = "20%";

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );
    
    if (progressBar) progressBar.style.width = "40%";
    if (loadingStatus) loadingStatus.innerText = "Đang cấu hình mô hình tay...";

    // 1. Nạp HandLandmarker
    try {
      state.handLandmarker = await createHandLandmarker(vision, "GPU");
    } catch (gpuErr) {
      console.warn("GPU HandLandmarker lỗi, chuyển sang CPU fallback:", gpuErr);
      state.handLandmarker = await createHandLandmarker(vision, null);
    }

    if (progressBar) progressBar.style.width = "60%";
    if (loadingStatus) loadingStatus.innerText = "Đang nạp mô hình gương mặt AR...";

    // 2. Nạp FaceLandmarker
    try {
      state.faceLandmarker = await createFaceLandmarker(vision, "GPU");
    } catch (faceGpuErr) {
      console.warn("GPU FaceLandmarker lỗi, chuyển sang CPU fallback:", faceGpuErr);
      try {
        state.faceLandmarker = await createFaceLandmarker(vision, null);
      } catch (faceErr) {
        console.error("Không thể nạp FaceLandmarker:", faceErr);
      }
    }

    if (progressBar) progressBar.style.width = "80%";
    if (loadingStatus) loadingStatus.innerText = "Đang nạp nhận diện viền người...";

    // 3. Nạp Image Segmenter
    try {
      state.imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false
      });
      state.isSegmenterLoaded = true;
    } catch (segmenterErr) {
      console.warn("Không thể nạp Image Segmenter, dùng hiệu ứng fallback từ tay:", segmenterErr);
      state.isSegmenterLoaded = false;
    }

    if (progressBar) progressBar.style.width = "100%";
    if (loadingStatus) loadingStatus.innerText = "Hoàn thành! Đang bắt đầu khởi động...";
    console.log("Khởi tạo các mô hình MediaPipe thành công!");
    
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

function extractPersonOutlinePoints(mask, maskWidth, maskHeight, canvasWidth, canvasHeight) {
  if (!mask || !maskWidth || !maskHeight) return [];

  const points = [];
  const step = Math.max(2, Math.floor(Math.min(maskWidth, maskHeight) / 92));
  const isPerson = (x, y) => mask[y * maskWidth + x] === 1;

  for (let y = step; y < maskHeight - step; y += step) {
    for (let x = step; x < maskWidth - step; x += step) {
      if (!isPerson(x, y)) continue;

      const touchesBackground =
        !isPerson(x - step, y) ||
        !isPerson(x + step, y) ||
        !isPerson(x, y - step) ||
        !isPerson(x, y + step);

      if (!touchesBackground) continue;

      const normalizedX = x / maskWidth;
      const visualX = state.mirrorCamera ? (1 - normalizedX) * canvasWidth : normalizedX * canvasWidth;
      points.push({
        x: visualX,
        y: (y / maskHeight) * canvasHeight
      });
    }
  }

  if (points.length <= 320) return points;

  const sampled = [];
  const sampleStep = points.length / 320;
  for (let i = 0; i < 320; i++) {
    sampled.push(points[Math.floor(i * sampleStep)]);
  }
  return sampled;
}

function createHandOutlinePoints(hands, canvasWidth, canvasHeight) {
  const points = hands.flatMap((hand) => {
    return hand.map((pt) => ({
      x: state.mirrorCamera ? (1 - pt.x) * canvasWidth : pt.x * canvasWidth,
      y: pt.y * canvasHeight
    }));
  });

  if (points.length < 3) return [];

  const center = points.reduce((acc, point) => {
    acc.x += point.x;
    acc.y += point.y;
    return acc;
  }, { x: 0, y: 0 });
  center.x /= points.length;
  center.y /= points.length;

  const hull = points
    .map((point) => ({
      ...point,
      angle: Math.atan2(point.y - center.y, point.x - center.x),
      dist: Math.hypot(point.x - center.x, point.y - center.y)
    }))
    .sort((a, b) => a.angle - b.angle);

  const buckets = 32;
  const outline = [];
  for (let i = 0; i < buckets; i++) {
    const minAngle = -Math.PI + (i / buckets) * Math.PI * 2;
    const maxAngle = -Math.PI + ((i + 1) / buckets) * Math.PI * 2;
    const farthest = hull
      .filter((point) => point.angle >= minAngle && point.angle < maxAngle)
      .sort((a, b) => b.dist - a.dist)[0];

    if (farthest) {
      outline.push({
        x: farthest.x,
        y: farthest.y
      });
    }
  }

  // Nội suy thêm điểm giữa để outline tay dày và sóng không bị thưa.
  const smoothed = [];
  outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length];
    smoothed.push(point);
    if (next) {
      smoothed.push({
        x: (point.x + next.x) / 2,
        y: (point.y + next.y) / 2
      });
    }
  });

  return smoothed;
}

export function updatePersonSegmentation(video, canvasWidth, canvasHeight, timestamp) {
  if (!state.isSegmenterLoaded || !state.imageSegmenter || state.isSegmentingFrame) return;
  if (timestamp - state.lastSegmentationTime < state.segmentationIntervalMs) return;

  state.lastSegmentationTime = timestamp;
  state.isSegmentingFrame = true;

  try {
    state.imageSegmenter.segmentForVideo(video, timestamp, (result) => {
      try {
        const categoryMask = result?.categoryMask;
        const mask = categoryMask?.getAsUint8Array?.();
        const maskWidth = categoryMask?.width || video.videoWidth || canvasWidth;
        const maskHeight = categoryMask?.height || video.videoHeight || canvasHeight;
        state.personOutlinePoints = extractPersonOutlinePoints(mask, maskWidth, maskHeight, canvasWidth, canvasHeight);
        categoryMask?.close?.();
      } finally {
        state.isSegmentingFrame = false;
      }
    });
  } catch (err) {
    state.isSegmentingFrame = false;
    console.warn("Không thể segment frame hiện tại:", err);
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
    state.handOutlinePoints = createHandOutlinePoints([hand1, hand2], canvasWidth, canvasHeight);
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
        const hx = state.mirrorCamera ? (1 - singleHand[9].x) * canvasWidth : singleHand[9].x * canvasWidth;
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
  if (detectedCount === 0) state.handOutlinePoints = [];

  // Chỉ deactivate nếu đã qua cửa sổ dự đoán (tránh nhấp nháy)
  if (!wasRecentlyTwoHands) {
    deactivateGesture();
  }
}

// Kích hoạt cử chỉ chắp tay (chống gọi lặp nếu đã active)
function activateGesture(midX, midY, canvasWidth, canvasHeight, showToastCallback) {
  const effectX = state.mirrorCamera ? canvasWidth - midX : midX;

  if (!state.gestureActive) {
    state.gestureActive = true;
    triggerAuraEffects(midX, midY, canvasWidth, canvasHeight, showToastCallback);
  } else {
    // Tiếp tục duy trì chắp tay -> rơi nhẹ vài hạt bụi lấp lánh
    state.continuousSparkleTimer++;
    if (state.continuousSparkleTimer % 2 === 0) {
      state.particles.push(
        new Particle(
          effectX + (Math.random() - 0.5) * 40,
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
