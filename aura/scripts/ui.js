import { state } from "./state.js";
import { initAudio, playZenSound, playCameraShutter } from "./audio.js";
import { setupWebcam } from "./camera.js";

// DOM References
let colorBtns = null;
let soundBtns = null;
let volumeSlider = null;
let volumeVal = null;
let sensitivitySlider = null;
let sensitivityVal = null;
let toggleSkeleton = null;
let toggleMirror = null;
let cameraSelect = null;
let btnScreenshot = null;
let btnSettings = null;
let btnCloseSettings = null;
let settingsPopup = null;
let settingsBackdrop = null;
let toastNotification = null;
let video = null;
let canvas = null;
let btnHelp = null;
let btnCloseHelp = null;
let helpPopup = null;
let helpBackdrop = null;

let toastTimer = null;

// Hiển thị Toast thông báo xinh xắn
export function showToast(message) {
	if (!toastNotification) toastNotification = document.getElementById('toast-notification');
	if (!toastNotification) return;

	clearTimeout(toastTimer);
	toastNotification.innerText = message;
	toastNotification.classList.add('show');

	toastTimer = setTimeout(() => {
		toastNotification.classList.remove('show');
	}, 2500);
}

// Bắt đầu lắng nghe và gán sự kiện cho các điều khiển UI
export function setupUI() {
	colorBtns = document.querySelectorAll('.color-btn');
	soundBtns = document.querySelectorAll('[data-sound]');
	volumeSlider = document.getElementById('volume-slider');
	volumeVal = document.getElementById('volume-val');
	sensitivitySlider = document.getElementById('sensitivity-slider');
	sensitivityVal = document.getElementById('sensitivity-val');
	toggleSkeleton = document.getElementById('toggle-skeleton');
	toggleMirror = document.getElementById('toggle-mirror');
	cameraSelect = document.getElementById('camera-select');
	btnScreenshot = document.getElementById('btn-screenshot');
	btnSettings = document.getElementById('btn-settings');
	btnCloseSettings = document.getElementById('btn-close-settings');
	settingsPopup = document.getElementById('settings-popup');
	settingsBackdrop = document.getElementById('settings-backdrop');
	toastNotification = document.getElementById('toast-notification');
	video = document.getElementById('webcam');
	canvas = document.getElementById('canvas-overlay');
	btnHelp = document.getElementById('btn-help');
	btnCloseHelp = document.getElementById('btn-close-help');
	helpPopup = document.getElementById('help-popup');
	helpBackdrop = document.getElementById('help-backdrop');

	// Đồng bộ hóa trạng thái giao diện (UI) từ state đã nạp từ localStorage
	if (colorBtns) {
		colorBtns.forEach(btn => {
			if (btn.dataset.preset === state.activePreset) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});
	}
	if (soundBtns) {
		soundBtns.forEach(btn => {
			if (btn.dataset.sound === state.activeSound) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});
	}
	if (volumeSlider) {
		volumeSlider.value = Math.round(state.volume * 100);
	}
	if (volumeVal) {
		volumeVal.innerText = `${Math.round(state.volume * 100)}%`;
	}
	if (sensitivitySlider) {
		sensitivitySlider.value = state.sensitivitySliderVal;
	}
	if (sensitivityVal) {
		let label = "Bình thường";
		const val = state.sensitivitySliderVal;
		if (val < 15) label = "Khó chắp";
		else if (val >= 15 && val <= 22) label = "Khá nhạy";
		else label = "Cực kỳ nhạy";
		sensitivityVal.innerText = label;
	}
	if (toggleSkeleton) {
		toggleSkeleton.checked = state.showSkeleton;
	}
	if (toggleMirror) {
		toggleMirror.checked = state.mirrorCamera;
	}
	if (video) {
		if (state.mirrorCamera) {
			video.classList.remove('no-mirror');
		} else {
			video.classList.add('no-mirror');
		}
	}

	const closeSettings = () => {
		settingsPopup?.classList.remove('open');
		settingsBackdrop?.classList.remove('open');
		document.documentElement.classList.remove('settings-lock');
		btnSettings?.setAttribute('aria-expanded', 'false');
		btnSettings?.focus();
	};

	const openSettings = () => {
		settingsPopup?.classList.add('open');
		settingsBackdrop?.classList.add('open');
		document.documentElement.classList.add('settings-lock');
		btnSettings?.setAttribute('aria-expanded', 'true');
		btnCloseSettings?.focus();
	};

	if (btnSettings) {
		btnSettings.addEventListener('click', () => {
			if (settingsPopup?.classList.contains('open')) closeSettings();
			else openSettings();
		});
	}

	btnCloseSettings?.addEventListener('click', closeSettings);
	settingsBackdrop?.addEventListener('click', closeSettings);
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			if (helpPopup?.classList.contains('open')) closeHelp();
			else if (settingsPopup?.classList.contains('open')) closeSettings();
		}
	});

	// Popup Hướng dẫn sử dụng (nút ?)
	const closeHelp = () => {
		helpPopup?.classList.remove('open');
		helpBackdrop?.classList.remove('open');
	};

	const openHelp = () => {
		helpPopup?.classList.add('open');
		helpBackdrop?.classList.add('open');
	};

	btnHelp?.addEventListener('click', openHelp);
	btnCloseHelp?.addEventListener('click', closeHelp);
	helpBackdrop?.addEventListener('click', closeHelp);

	// Đảm bảo không sử dụng Face Filter do đã ẩn carousel
	state.activeFaceFilter = 'none';

	// 1. Đổi tông màu hào quang
	colorBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			colorBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');

			const preset = btn.dataset.preset;
			state.activePreset = preset;
			localStorage.setItem('active_preset', preset);

			// Đổi class theme ở thẻ body
			document.body.className = '';
			document.body.classList.add(`theme-${preset}`);

			showToast(`Đã chuyển sang: Hào quang ${btn.innerText.trim()}`);
		});
	});

	// 2. Đổi kiểu âm thanh thiền định
	soundBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			soundBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');

			const sound = btn.dataset.sound;
			state.activeSound = sound;
			localStorage.setItem('active_sound', sound);

			// Kích hoạt thử âm thanh
			initAudio();
			if (state.activeSound !== 'mute') {
				playZenSound();
				showToast(`Đã chọn âm thanh: ${btn.innerText.trim()}`);
			} else {
				showToast("Đã tắt âm thanh");
			}
		});
	});

	// 3. Slider Âm lượng
	if (volumeSlider) {
		volumeSlider.addEventListener('input', (e) => {
			const val = e.target.value;
			state.volume = val / 100;
			localStorage.setItem('volume', state.volume);
			if (volumeVal) volumeVal.innerText = `${val}%`;
		});
	}

	// 4. Slider Độ nhạy AI
	if (sensitivitySlider) {
		sensitivitySlider.addEventListener('input', (e) => {
			const val = parseInt(e.target.value, 10);
			state.sensitivitySliderVal = val;
			state.sensitivityThreshold = 0.25 + (val / 100); // Công thức mới: khó chắp hơn
			localStorage.setItem('sensitivity_slider_val', val);

			let label = "Bình thường";
			if (val < 15) label = "Khó chắp";
			else if (val >= 15 && val <= 22) label = "Khá nhạy";
			else label = "Cực kỳ nhạy";

			if (sensitivityVal) sensitivityVal.innerText = label;
		});
	}

	// 5. Bật/tắt hiện xương tay AI
	if (toggleSkeleton) {
		toggleSkeleton.addEventListener('change', (e) => {
			state.showSkeleton = e.target.checked;
			localStorage.setItem('show_skeleton', state.showSkeleton);
			showToast(state.showSkeleton ? "Bật bộ xương tay AI" : "Ẩn bộ xương tay AI");
		});
	}

	// 6. Bật/tắt lật gương camera
	if (toggleMirror) {
		toggleMirror.addEventListener('change', (e) => {
			state.mirrorCamera = e.target.checked;
			localStorage.setItem('mirror_camera', state.mirrorCamera);
			if (video) {
				if (state.mirrorCamera) {
					video.classList.remove('no-mirror');
				} else {
					video.classList.add('no-mirror');
				}
			}
			showToast(state.mirrorCamera ? "Đã bật lật gương" : "Đã tắt lật gương");
		});
	}

	// 7. Thay đổi camera đầu vào từ dropdown
	if (cameraSelect) {
		cameraSelect.addEventListener('change', async (e) => {
			const deviceId = e.target.value;
			if (deviceId) {
				showToast("Đang chuyển đổi Camera...");
				await setupWebcam(deviceId, showToast);
			}
		});
	}

	// 8. Chụp ảnh hào quang lấp lánh (Screenshot)
	if (btnScreenshot) {
		btnScreenshot.addEventListener('click', () => {
			if (!state.isCameraActive) return;
			playCameraShutter();
			try {
				if (canvas) {
					const dataUrl = canvas.toDataURL("image/png");
					const downloadLink = document.createElement("a");
					downloadLink.href = dataUrl;
					const dateStr = new Date().toISOString().slice(0, 10);
					downloadLink.download = `hao-quang-ho-the-${dateStr}.png`;
					document.body.appendChild(downloadLink);
					downloadLink.click();
					document.body.removeChild(downloadLink);
					showToast("📸 Đã chụp ảnh và lưu về máy thành công!");
				}
			} catch (err) {
				console.error("Lỗi khi chụp ảnh màn hình:", err);
				showToast("❌ Không thể chụp ảnh do giới hạn CORS!");
			}
		});
	}

	// 9. Dark Veil — Chu kỳ sương khói
	const veilIntervalBtns = document.querySelectorAll('[data-veil-interval]');
	veilIntervalBtns.forEach(btn => {
		const val = parseInt(btn.dataset.veilInterval, 10);
		if (val === state.darkIntervalMs) btn.classList.add('active');
		btn.addEventListener('click', () => {
			veilIntervalBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			state.darkIntervalMs = val;
			localStorage.setItem('dark_interval_ms', val);
			showToast(`⛅ Chu kỳ sương: ${val / 1000}s`);
		});
	});

	// 10. Dark Veil — Tốc độ sương
	const veilGrowBtns = document.querySelectorAll('[data-veil-grow]');
	veilGrowBtns.forEach(btn => {
		const val = parseInt(btn.dataset.veilGrow, 10);
		if (val === state.darkGrowMs) btn.classList.add('active');
		btn.addEventListener('click', () => {
			veilGrowBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			state.darkGrowMs = val;
			localStorage.setItem('dark_grow_ms', val);
			showToast(`💨 Tốc độ sương: ${btn.innerText.trim()}`);
		});
	});
}
