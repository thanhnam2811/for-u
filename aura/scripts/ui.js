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
let toastNotification = null;
let video = null;
let canvas = null;

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
  soundBtns = document.querySelectorAll('.sound-btn');
  volumeSlider = document.getElementById('volume-slider');
  volumeVal = document.getElementById('volume-val');
  sensitivitySlider = document.getElementById('sensitivity-slider');
  sensitivityVal = document.getElementById('sensitivity-val');
  toggleSkeleton = document.getElementById('toggle-skeleton');
  toggleMirror = document.getElementById('toggle-mirror');
  cameraSelect = document.getElementById('camera-select');
  btnScreenshot = document.getElementById('btn-screenshot');
  toastNotification = document.getElementById('toast-notification');
  video = document.getElementById('webcam');
  canvas = document.getElementById('canvas-overlay');

  // 1. Đổi tông màu hào quang
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const preset = btn.dataset.preset;
      state.activePreset = preset;
      
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
      
      state.activeSound = btn.dataset.sound;
      
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
      if (volumeVal) volumeVal.innerText = `${val}%`;
    });
  }

  // 4. Slider Độ nhạy AI
  if (sensitivitySlider) {
    sensitivitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      // Slider càng cao càng dễ chạm -> Ngưỡng khoảng cách cho phép càng rộng (0.10 -> 0.30)
      state.sensitivityThreshold = 0.08 + (val / 100);
      
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
      showToast(state.showSkeleton ? "Bật bộ xương tay AI" : "Ẩn bộ xương tay AI");
    });
  }

  // 6. Bật/tắt lật gương camera
  if (toggleMirror) {
    toggleMirror.addEventListener('change', (e) => {
      state.mirrorCamera = e.target.checked;
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
      
      // Phát ra tiếng màn trập camera ảo
      playCameraShutter();

      // Chụp ảnh từ canvas
      try {
        if (canvas) {
          const dataUrl = canvas.toDataURL("image/png");
          
          // Tạo phần tử tải ảnh ảo
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
}
