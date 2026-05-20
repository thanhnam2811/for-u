import { state } from "./state.js";

let video = null;
let cameraSelect = null;
let loadingStatus = null;

function initDomRefs() {
  if (!video) video = document.getElementById('webcam');
  if (!cameraSelect) cameraSelect = document.getElementById('camera-select');
  if (!loadingStatus) loadingStatus = document.getElementById('loading-status');
}

// Khởi động Webcam và cấp quyền trình duyệt
export async function setupWebcam(deviceId = null, showToastCallback) {
  initDomRefs();

  if (state.webcamStream) {
    state.webcamStream.getTracks().forEach(track => track.stop());
  }

  state.isCameraActive = false;
  
  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" },
    audio: false
  };

  try {
    state.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = state.webcamStream;
    
    // Đợi luồng webcam nạp dữ liệu xong
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve();
      };
    });
    
    state.isCameraActive = true;
    console.log("Khởi động webcam thành công!");
    return true;
  } catch (err) {
    console.error("Không thể mở webcam:", err);
    if (showToastCallback) {
      showToastCallback("⚠️ Lỗi: Không thể truy cập Camera. Vui lòng cấp quyền!");
    }
    if (loadingStatus) {
      loadingStatus.innerText = "Lỗi: Không truy cập được Camera. Vui lòng cấp quyền và tải lại trang.";
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
