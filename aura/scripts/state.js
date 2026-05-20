// Quản lý trạng thái động của ứng dụng bằng một đối tượng mutable duy nhất
// Giúp tránh các lỗi Read-Only Binding của ES Modules khi các file khác cập nhật biến

export const state = {
  // Trạng thái mô hình AI & Camera
  handLandmarker: null,
  webcamStream: null,
  lastVideoTime: -1,
  isModelLoaded: false,
  isCameraActive: false,

  // Cấu hình người dùng (Mặc định)
  activePreset: 'gold',     // gold, cosmic, lotus, emerald
  activeSound: 'gong',      // gong, chime, bowl, mute
  volume: 0.7,              // 0.0 -> 1.0
  sensitivityThreshold: 0.28, // Ngưỡng khoảng cách chắp tay (0.12 -> 0.28)
  showSkeleton: true,
  mirrorCamera: true,

  // Trạng thái nhận diện cử chỉ hiện tại
  gestureActive: false,
  distanceNormalized: 999,
  lastHandsDetected: 0,

  // Bộ theo dõi lịch sử 2 tay (để dự đoán chắp tay khi MediaPipe mất detect 1 tay)
  lastTwoHandsTime: 0,        // Timestamp lần cuối thấy 2 tay
  lastTwoHandsDist: 999,       // Khoảng cách chuẩn hoá lần cuối khi thấy 2 tay
  lastTwoHandsMidX: 0,         // Toạ độ X tâm giữa 2 tay lần cuối
  lastTwoHandsMidY: 0,         // Toạ độ Y tâm giữa 2 tay lần cuối
  predictionWindowMs: 500,     // Cửa sổ thời gian cho phép dự đoán (ms)

  // Chỉ số đo hiệu năng (FPS)
  lastFrameTime: performance.now(),
  frameCount: 0,
  currentFps: 0,

  // Mảng chứa các đối tượng hiệu ứng đang vẽ
  particles: [],
  ripples: [],
  floatingTexts: [],
  continuousSparkleTimer: 0,

  // Điểm Tích Phước (localStorage)
  phuocCount: parseInt(localStorage.getItem('phuoc_count') || '0', 10),

  // Web Audio Context
  audioCtx: null
};

// Hàm cập nhật và lưu phước đức vào localStorage
export function incrementPhuoc() {
  state.phuocCount++;
  localStorage.setItem('phuoc_count', state.phuocCount);
  return state.phuocCount;
}
