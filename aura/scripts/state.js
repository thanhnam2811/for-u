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
	sensitivityThreshold: 0.7,
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
	smoothedDistanceNormalized: 999,
	lastHandsDetected: 0,
	prevNormalizedDist: 999,     // Để tính signal convergence
	stableTwoHandFrames: 0,
	prayerCandidateFrames: 0,
	gestureMissFrames: 0,
	lastGestureRewardTime: 0,    // Timestamp lần gần nhất được cộng phước / phát feedback chính
	gestureRewardCooldownMs: 700, // Cooldown ngắn để vòng chắp tay kế vẫn có chuông nhưng không spam khi detector rung

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
	lanterns: [],                // Mảng chứa các Hoa Đăng đang trôi
	lanternsLastAddedAt: 0,      // Cooldown click cho Hoa Đăng

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
	auraWaveCenterX: 0,
	auraWaveCenterY: 0,
	auraWaveRadius: 0,
	auraWaveActive: false,

	// ─────────────────────────────────────────────
	// Web Audio Context
	// ─────────────────────────────────────────────
	audioCtx: null,

	// ─────────────────────────────────────────────
	// Continuous sparkle timer (dùng trong AI)
	// ─────────────────────────────────────────────
};

// Hằng số Dark Veil
export const MAX_DARK_OPACITY = 0.62; // Không bao giờ vượt mức sương này
export const DARK_HOLD_MS = 5000;     // Giữ mức tối đa trước khi duy trì sương dày chờ user clear

// Hằng số Hoa Đăng
export const LANTERN_COST = 10;
export const MAX_LANTERNS = 40;
export const LANTERN_COOLDOWN_MS = 300;
export const LANTERN_LIFESPAN_MS = 30 * 60 * 1000; // 30 phút

export function getSensitivityThresholdForSlider(sliderVal) {
	return 0.42 + (sliderVal / 100);
}

// Cập nhật ngưỡng độ nhạy ban đầu từ slider val
state.sensitivityThreshold = getSensitivityThresholdForSlider(state.sensitivitySliderVal);

// Hàm cập nhật và lưu phước đức vào localStorage
export function incrementPhuoc() {
	state.phuocCount++;
	localStorage.setItem('phuoc_count', state.phuocCount);
	return state.phuocCount;
}

// Hàm tiêu phước
export function spendPhuoc(amount) {
	if (state.phuocCount >= amount) {
		state.phuocCount -= amount;
		localStorage.setItem('phuoc_count', state.phuocCount);
		return true;
	}
	return false;
}

// Lưu trữ Hoa Đăng
export function saveLanternsState() {
	const activeLanterns = state.lanterns
		.filter(l => l.phase !== 'DONE' && l.id)
		.map(l => ({
			id: l.id,
			spawnedAt: l.spawnedAt,
			xRatio: l.xRatio,
			baseYRatio: l.baseYRatio,
			phaseSeed: l.phaseSeed,
			startX: l.startX,
			startY: l.startY
		}));
	localStorage.setItem('lanterns_data', JSON.stringify(activeLanterns));
}
