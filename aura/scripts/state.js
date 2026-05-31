// Quản lý trạng thái động của ứng dụng bằng một đối tượng mutable duy nhất
// Giúp tránh các lỗi Read-Only Binding của ES Modules khi các file khác cập nhật biến

export const state = {
	// ─────────────────────────────────────────────
	// Trạng thái mô hình AI & Camera
	// ─────────────────────────────────────────────
	handLandmarker: null,
	webcamStream: null,
	lastVideoTime: -1,
	isModelLoaded: false,
	isCameraActive: false,

	// ─────────────────────────────────────────────
	// Cấu hình người dùng (tải từ localStorage)
	// ─────────────────────────────────────────────
	activePreset: localStorage.getItem('active_preset') || 'lotus',
	activeSound: localStorage.getItem('active_sound') || 'gong',
	volume: localStorage.getItem('volume') !== null ? parseFloat(localStorage.getItem('volume')) : 0.7,
	sensitivitySliderVal: localStorage.getItem('sensitivity_slider_val') !== null
		? parseInt(localStorage.getItem('sensitivity_slider_val'), 10) : 28,
	sensitivityThreshold: 0.55,
	showSkeleton: localStorage.getItem('show_skeleton') !== null
		? localStorage.getItem('show_skeleton') === 'true' : true,
	mirrorCamera: localStorage.getItem('mirror_camera') !== null
		? localStorage.getItem('mirror_camera') === 'true' : true,
	activeFaceFilter: localStorage.getItem('active_face_filter') || 'none',
	faceLandmarker: null,
	faceLandmarks: null,
	handResults: null,
	lastCameraError: null,

	// ─────────────────────────────────────────────
	// Dark Veil settings (từ localStorage)
	// ─────────────────────────────────────────────
	// Chu kỳ sương (ms): 30000 / 45000 / 60000 / 90000
	darkIntervalMs: localStorage.getItem('dark_interval_ms') !== null
		? parseInt(localStorage.getItem('dark_interval_ms'), 10) : 45000,
	// Tốc độ sương (ms để đạt mức tối đa): 15000 / 25000 / 40000
	darkGrowMs: localStorage.getItem('dark_grow_ms') !== null
		? parseInt(localStorage.getItem('dark_grow_ms'), 10) : 25000,

	// ─────────────────────────────────────────────
	// Trạng thái nhận diện cử chỉ
	// ─────────────────────────────────────────────
	gestureActive: false,
	distanceNormalized: 999,
	lastHandsDetected: 0,
	prevNormalizedDist: 999,     // Để tính signal convergence
	lastGestureRewardTime: 0,    // Timestamp lần gần nhất được cộng phước / phát feedback chính
	gestureRewardCooldownMs: 2500, // Cooldown cho sound/counter để tránh spam phản hồi

	// ─────────────────────────────────────────────
	// Chỉ số đo hiệu năng (FPS)
	// ─────────────────────────────────────────────
	lastFrameTime: performance.now(),
	frameCount: 0,
	currentFps: 0,

	// ─────────────────────────────────────────────
	// Mảng chứa các đối tượng hiệu ứng đang vẽ
	// ─────────────────────────────────────────────
	particles: [],
	ripples: [],
	bodyAuraWaves: [],
	auraBursts: [],
	bodyGlowPulses: [],          // Hiệu ứng glow từ viền cơ thể ra ngoài
	prayerAuras: [],             // Timeline hào quang cinematic sau khi chắp tay

	// ─────────────────────────────────────────────
	// Runtime data cho effect đang hoạt động
	// ─────────────────────────────────────────────
	// Điểm Tích Phước (localStorage)
	// ─────────────────────────────────────────────
	phuocCount: parseInt(localStorage.getItem('phuoc_count') || '0', 10),

	// ─────────────────────────────────────────────
	// Dark Veil runtime state
	// ─────────────────────────────────────────────
	darkPhase: 'idle',           // 'idle' | 'growing' | 'holding' | 'clearing'
	darkOpacity: 0,              // Độ mờ hiện tại (0 → MAX_DARK_OPACITY)
	darkStartTime: 0,            // Timestamp bắt đầu chu kỳ
	darkHoldStartTime: 0,        // Timestamp khi đạt mức tối đa (bắt đầu hold)
	darkClearRadius: 0,          // Bán kính vùng đã xóa khi chắp tay
	darkClearCenterX: 0,
	darkClearCenterY: 0,
	darkClearActive: false,      // Đang trong quá trình clearing không

	// ─────────────────────────────────────────────
	// Web Audio Context
	// ─────────────────────────────────────────────
	audioCtx: null,

	// ─────────────────────────────────────────────
	// Continuous sparkle timer (dùng trong AI)
	// ─────────────────────────────────────────────
};

// Hằng số Dark Veil
export const MAX_DARK_OPACITY = 0.55;      // Không bao giờ vượt mức sương này
export const DARK_HOLD_MS = 5000;          // Giữ mức tối đa 5s rồi tự giảm nhẹ
export const DARK_AUTO_CLEAR_OPACITY = 0.3; // Mức tự giảm về sau hold

// Cập nhật ngưỡng độ nhạy ban đầu từ slider val
state.sensitivityThreshold = 0.25 + (state.sensitivitySliderVal / 100);

// Hàm cập nhật và lưu phước đức vào localStorage
export function incrementPhuoc() {
	state.phuocCount++;
	localStorage.setItem('phuoc_count', state.phuocCount);
	return state.phuocCount;
}
