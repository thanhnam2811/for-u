// Quản lý trạng thái động của ứng dụng bằng một đối tượng mutable duy nhất
// Giúp tránh các lỗi Read-Only Binding của ES Modules khi các file khác cập nhật biến

export const state = {
  // Trạng thái mô hình AI & Camera
  handLandmarker: null,
  imageSegmenter: null,
  webcamStream: null,
  lastVideoTime: -1,
  isModelLoaded: false,
  isSegmenterLoaded: false,
  isCameraActive: false,

  // Cấu hình người dùng (Mặc định được tải từ localStorage hoặc mặc định ban đầu)
  activePreset: localStorage.getItem('active_preset') || 'lotus',     // Mặc định Hồng Sen cho người yêu USER
  activeSound: localStorage.getItem('active_sound') || 'gong',
  volume: localStorage.getItem('volume') !== null ? parseFloat(localStorage.getItem('volume')) : 0.7,
  sensitivitySliderVal: localStorage.getItem('sensitivity_slider_val') !== null ? parseInt(localStorage.getItem('sensitivity_slider_val'), 10) : 20,
  sensitivityThreshold: 0.55, // Ngưỡng khoảng cách chắp tay sau khi chuẩn hóa theo kích thước bàn tay (sẽ được cập nhật từ sensitivitySliderVal bên dưới)
  showSkeleton: localStorage.getItem('show_skeleton') !== null ? localStorage.getItem('show_skeleton') === 'true' : true,
  mirrorCamera: localStorage.getItem('mirror_camera') !== null ? localStorage.getItem('mirror_camera') === 'true' : true,
  activeFaceFilter: localStorage.getItem('active_face_filter') || 'none', // none, glasses, rabbit, halo, cat
  faceLandmarker: null,
  faceLandmarks: null, // Lưu toạ độ gương mặt AR phát hiện được
  handResults: null,   // Lưu kết quả nhận diện tay của MediaPipe


  // Trạng thái nhận diện cử chỉ hiện tại
  gestureActive: false,
  distanceNormalized: 999,
  lastHandsDetected: 0,

  // Bộ theo dõi lịch sử 2 tay (để dự đoán chắp tay khi MediaPipe mất detect 1 tay)
  lastTwoHandsTime: 0,        // Timestamp lần cuối thấy 2 tay
  lastTwoHandsDist: 999,       // Khoảng cách chuẩn hoá lần cuối khi thấy 2 tay
  lastTwoHandsMidX: 0,         // Toạ độ X tâm giữa 2 tay lần cuối
  lastTwoHandsMidY: 0,         // Toạ độ Y tâm giữa 2 tay lần cuối
  predictionWindowMs: 900,     // Cửa sổ thời gian cho phép dự đoán (ms)

  // Chỉ số đo hiệu năng (FPS)
  lastFrameTime: performance.now(),
  frameCount: 0,
  currentFps: 0,

  // Mảng chứa các đối tượng hiệu ứng đang vẽ
  particles: [],
  ripples: [],
  bodyAuraWaves: [],
  floatingTexts: [],
  continuousSparkleTimer: 0,

  // Mask người dùng để tạo hào quang từ viền cơ thể
  personOutlinePoints: [],
  handOutlinePoints: [],
  lastSegmentationTime: 0,
  segmentationIntervalMs: 140,
  isSegmentingFrame: false,

  // Điểm Tích Phước (localStorage)
  phuocCount: parseInt(localStorage.getItem('phuoc_count') || '0', 10),

  // Web Audio Context
  audioCtx: null
};

// Cập nhật ngưỡng độ nhạy ban đầu từ slider val
state.sensitivityThreshold = 0.35 + (state.sensitivitySliderVal / 100);

// Hàm cập nhật và lưu phước đức vào localStorage
export function incrementPhuoc() {
  state.phuocCount++;
  localStorage.setItem('phuoc_count', state.phuocCount);
  return state.phuocCount;
}

