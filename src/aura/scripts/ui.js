import { getSensitivityThresholdForSlider, state, spendPhuoc, LANTERN_TYPES, LANTERN_ASSETS, MAX_LANTERNS, LANTERN_LIFESPAN_MS } from "./state.js";
import { initAudio, playZenSound, playCameraShutter } from "./audio.js";
import { setupWebcam } from "./camera.js";
import { LotusLantern } from "./effects/lantern.js";

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
let btnVeilHelp = null;
let btnCloseHelp = null;
let helpPopup = null;
let helpBackdrop = null;

let veilHelpPopup = null;
let veilHelpBackdrop = null;
let btnCloseVeilHelp = null;

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
	btnVeilHelp = document.getElementById('btn-veil-help');
	btnCloseHelp = document.getElementById('btn-close-help');
	helpPopup = document.getElementById('help-popup');
	helpBackdrop = document.getElementById('help-backdrop');

	veilHelpPopup = document.getElementById('veil-help-popup');
	veilHelpBackdrop = document.getElementById('veil-help-backdrop');
	btnCloseVeilHelp = document.getElementById('btn-close-veil-help');

	// Khôi phục hoa đăng từ lần chơi trước
	try {
		const savedData = JSON.parse(localStorage.getItem('lanterns_data') || '[]');
		if (Array.isArray(savedData) && canvas) {
			const now = Date.now();
			savedData.forEach(config => {
				if (now - config.spawnedAt < LANTERN_LIFESPAN_MS) {
					config.canvasWidth = canvas.width;
					config.canvasHeight = canvas.height;
					state.lanterns.push(new LotusLantern(config));
				}
			});
		}
	} catch (e) { console.error("Lỗi parse hoa đăng:", e); }

	// Xử lý Popover hướng dẫn thả hoa đăng (Đã bị loại bỏ vì chuyển sang nút Shop riêng)
	const phuocPopover = document.getElementById('phuoc-popover');
	if (phuocPopover) {
		phuocPopover.style.display = 'none';
	}


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
			if (veilHelpPopup?.classList.contains('open')) closeVeilHelp();
			else if (helpPopup?.classList.contains('open')) closeHelp();
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

	// Popup Cẩm nang Sương khói
	const closeVeilHelp = () => {
		veilHelpPopup?.classList.remove('open');
		veilHelpBackdrop?.classList.remove('open');
	};

	const openVeilHelp = () => {
		veilHelpPopup?.classList.add('open');
		veilHelpBackdrop?.classList.add('open');
	};

	btnVeilHelp?.addEventListener('click', openVeilHelp);
	btnCloseVeilHelp?.addEventListener('click', closeVeilHelp);
	veilHelpBackdrop?.addEventListener('click', closeVeilHelp);

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

			// Đổi class theme ở thẻ body nhưng giữ các class khác
			const themesToRemove = [];
			document.body.classList.forEach(cls => {
				if (cls.startsWith('theme-')) {
					themesToRemove.push(cls);
				}
			});
			themesToRemove.forEach(cls => document.body.classList.remove(cls));
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
			state.sensitivityThreshold = getSensitivityThresholdForSlider(val);
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

	// ==========================================
	// GIAO DIỆN CỬA HÀNG VẠN HẠNH (SHOP)
	// ==========================================
	const shopPopup = document.getElementById('shop-popup');
	const shopBackdrop = document.getElementById('shop-backdrop');
	const btnCloseShop = document.getElementById('btn-close-shop');
	const shopItemsContainer = document.getElementById('shop-items-container');

	const openShop = () => {

		shopPopup.classList.add('open');
		shopBackdrop.classList.add('show');
	};

	const closeShop = () => {
		shopPopup.classList.remove('open');
		shopBackdrop.classList.remove('show');
	};

	if (btnCloseShop) btnCloseShop.addEventListener('click', closeShop);
	if (shopBackdrop) shopBackdrop.addEventListener('click', closeShop);
	const btnShop = document.getElementById('btn-shop');
	if (btnShop) btnShop.addEventListener('click', openShop);

	// Render danh sách mặt hàng
	if (shopItemsContainer) {
		shopItemsContainer.innerHTML = '';
		Object.keys(LANTERN_TYPES).forEach(key => {
			const item = LANTERN_TYPES[key];
			const itemEl = document.createElement('div');
			itemEl.className = 'flex items-center gap-4 p-3 bg-white/5 dark:bg-slate-900/40 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl mb-3';
			itemEl.innerHTML = `
				<div class="w-14 h-14 flex items-center justify-center bg-black/20 rounded-xl shrink-0 p-1.5">
					<img class="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" src="${LANTERN_ASSETS[item.assetKey].dataUrl}" alt="${item.name}" />
				</div>
				<div class="flex-1 min-w-0">
					<div class="font-display font-bold text-sm text-slate-850 dark:text-slate-100 mb-0.5 truncate">${item.name}</div>
					<div class="text-xs text-slate-500 dark:text-slate-400 leading-normal mb-2">${item.desc}</div>
					<button class="btn-buy inline-flex items-center gap-1 px-3 py-1.5 bg-brand-pink/15 text-brand-pink border border-brand-pink/30 rounded-full text-xs font-bold cursor-pointer transition-all hover:bg-brand-pink/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95" data-type="${key}" data-price="${item.price}">
						<span class="material-icons-round" style="font-size: 14px;">favorite</span> 
						${item.price}
					</button>
				</div>
			`;
			shopItemsContainer.appendChild(itemEl);
		});

		// Xử lý mua hàng
		let isBuying = false;
		shopItemsContainer.addEventListener('click', (e) => {
			const btn = e.target.closest('.btn-buy');
			if (!btn || isBuying) return;

			const typeKey = btn.dataset.type;
			const price = parseInt(btn.dataset.price, 10);
			const itemConfig = LANTERN_TYPES[typeKey];

			if (!itemConfig) return;

			if (state.phuocCount >= price) {
				// Đủ tiền -> Mua
				isBuying = true;
				spendPhuoc(price);

				// Lấy tọa độ nút bấm
				const rect = btn.getBoundingClientRect();
				const startX = rect.left + rect.width / 2;
				const startY = rect.top + rect.height / 2;

				// LotusLantern đã import tĩnh ở đầu file — không cần dynamic import
				// Xóa bớt nếu quá nhiều
				if (state.lanterns.length >= MAX_LANTERNS) {
					state.lanterns[0].startFadeOut();
				}

				const lantern = new LotusLantern({
					type: typeKey,
					startX,
					startY,
					canvasWidth: canvas.width,
					canvasHeight: canvas.height
				});
				state.lanterns.push(lantern);
				state.engine.dirtyFlags.lanterns = true;

				// Chống click đúp (cooldown 300ms)
				setTimeout(() => { isBuying = false; }, 300);
			} else {
				// Không đủ tiền -> Rung lắc
				btn.classList.add('error');
				setTimeout(() => {
					btn.classList.remove('error');
				}, 400);
			}
		});
	}
}
