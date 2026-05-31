import { state } from "./state.js";

let video = null;
let cameraWrapper = null;
let cameraSelect = null;
let loadingStatus = null;

function initDomRefs() {
	if (!video) video = document.getElementById('webcam');
	if (!cameraWrapper) cameraWrapper = document.getElementById('camera-wrapper');
	if (!cameraSelect) cameraSelect = document.getElementById('camera-select');
	if (!loadingStatus) loadingStatus = document.getElementById('loading-status');
}

function syncCameraAspectRatio() {
	if (!video || !cameraWrapper || !video.videoWidth || !video.videoHeight) return;
	cameraWrapper.style.setProperty('--camera-aspect-ratio', `${video.videoWidth} / ${video.videoHeight}`);
}

// Khởi động Webcam và cấp quyền trình duyệt
export async function setupWebcam(deviceId = null, showToastCallback) {
	initDomRefs();

	const secureContext = window.isSecureContext;
	const hasMediaDevices = !!navigator.mediaDevices;
	const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;

	if (!hasMediaDevices || !hasGetUserMedia) {
		const error = new Error(
			secureContext
				? "Browser does not expose navigator.mediaDevices.getUserMedia"
				: "navigator.mediaDevices.getUserMedia is unavailable outside a secure context"
		);
		error.name = secureContext ? "MediaDevicesUnavailableError" : "InsecureContextError";

		state.lastCameraError = {
			name: error.name,
			message: error.message,
			stack: error.stack || ''
		};

		console.error(
			"Không thể mở webcam:",
			error.name,
			{
				secureContext,
				protocol: window.location.protocol,
				host: window.location.host,
				hasMediaDevices,
				hasGetUserMedia
			},
			error
		);

		if (showToastCallback) {
			showToastCallback(
				secureContext
					? "Trình duyệt hiện tại chưa hỗ trợ camera cho trải nghiệm này."
					: "⚠️ Safari trên iPhone cần HTTPS để dùng camera qua mạng nội bộ."
			);
		}

		if (loadingStatus) {
			loadingStatus.innerText = secureContext
				? "Trình duyệt hiện tại chưa hỗ trợ camera cho trải nghiệm này."
				: "Safari trên iPhone cần HTTPS để mở camera qua mạng nội bộ.";
		}

		return false;
	}

	if (state.webcamStream) {
		state.webcamStream.getTracks().forEach((track) => track.stop());
		state.webcamStream = null;
	}

	if (video) {
		try {
			video.pause();
		} catch (err) {
			console.warn("Không thể pause video hiện tại:", err);
		}
		video.srcObject = null;
		video.onloadedmetadata = null;
	}

	state.isCameraActive = false;
	state.lastVideoTime = -1;
	state.handResults = null;
	state.faceLandmarks = null;
	state.lastCameraError = null;

	const constraints = {
		video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" },
		audio: false
	};

	try {
		state.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
		video.muted = true;
		video.defaultMuted = true;
		video.playsInline = true;
		video.setAttribute('muted', '');
		video.setAttribute('playsinline', '');
		video.setAttribute('webkit-playsinline', '');
		video.srcObject = state.webcamStream;

		await new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				video.onloadedmetadata = null;
				reject(new Error("Webcam metadata timeout"));
			}, 5000);

			video.onloadedmetadata = () => {
				clearTimeout(timeoutId);
				syncCameraAspectRatio();
				video.onloadedmetadata = null;
				resolve();
			};

			if (video.readyState >= 1) {
				clearTimeout(timeoutId);
				syncCameraAspectRatio();
				video.onloadedmetadata = null;
				resolve();
			}
		});

		const playPromise = video.play();
		if (playPromise && typeof playPromise.then === 'function') {
			playPromise.catch((err) => {
				console.warn("Video.play() không hoàn tất ngay trên thiết bị này:", err);
			});
		}

		state.isCameraActive = true;
		state.lastCameraError = null;
		console.log("Khởi động webcam thành công!");
		return true;
	} catch (err) {
		state.lastCameraError = {
			name: err?.name || 'UnknownCameraError',
			message: err?.message || String(err),
			stack: err?.stack || ''
		};
		console.error("Không thể mở webcam:", err?.name || err, err);
		if (showToastCallback) {
			showToastCallback("⚠️ Không thể truy cập camera. Hãy kiểm tra quyền camera và thử lại.");
		}
		if (loadingStatus) {
			loadingStatus.innerText = "Không mở được camera. Hãy kiểm tra quyền truy cập rồi thử lại.";
		}
		return false;
	}
}

// Dò tìm danh sách các thiết bị video đầu vào
export async function getCameraDevices() {
	initDomRefs();

	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter(device => device.kind === 'videoinput');

		if (cameraSelect) {
			cameraSelect.innerHTML = '';
			if (videoDevices.length === 0) {
				cameraSelect.innerHTML = '<option value="">Không thấy camera nào</option>';
				return;
			}

			videoDevices.forEach((device, index) => {
				const option = document.createElement('option');
				option.value = device.deviceId;
				option.text = device.label || `Camera ${index + 1}`;
				cameraSelect.appendChild(option);
			});
		}
	} catch (err) {
		console.error("Không thể lấy danh sách camera:", err);
	}
}
