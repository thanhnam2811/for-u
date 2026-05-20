import { state } from "./state.js";
import { setupUI, showToast } from "./ui.js";
import { setupWebcam, getCameraDevices } from "./camera.js";
import { loadHandLandmarkerModel, drawHandSkeleton, analyzeHands } from "./ai.js";
import { drawAmbientHalo } from "./canvas-effects.js";
import { initAudio } from "./audio.js";

// DOM references and rendering Contexts
let video = null;
let canvas = null;
let ctx = null;

function initDomRefs() {
  if (!video) video = document.getElementById('webcam');
  if (!canvas) canvas = document.getElementById('canvas-overlay');
  if (canvas && !ctx) ctx = canvas.getContext('2d');
}

// Vòng lặp vẽ hiệu ứng 60 FPS
function renderLoop() {
  initDomRefs();

  // Tính toán FPS thực tế
  const now = performance.now();
  state.frameCount++;
  if (now > state.lastFrameTime + 1000) {
    state.currentFps = Math.round((state.frameCount * 1000) / (now - state.lastFrameTime));
    const statFps = document.getElementById('stat-fps');
    if (statFps) statFps.innerText = state.currentFps;
    state.frameCount = 0;
    state.lastFrameTime = now;
  }

  // Nếu canvas và video đã sẵn sàng hoạt động
  if (video && canvas && ctx && video.readyState >= 2) {
    // Đồng bộ kích thước canvas theo kích thước hiển thị thực tế của webcam
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Xóa sạch canvas chuẩn bị vẽ
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Vẽ trực tiếp Webcam làm nền lên Canvas trước
    ctx.save();
    if (state.mirrorCamera) {
      // Hiệu ứng lật gương webcam để người dùng chắp tay tự nhiên nhất
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Chạy AI dò bàn tay nếu mô hình đã sẵn sàng
    if (state.isModelLoaded && state.handLandmarker) {
      let timestamp = performance.now();
      if (video.currentTime !== state.lastVideoTime) {
        state.lastVideoTime = video.currentTime;
        
        try {
          const results = state.handLandmarker.detectForVideo(video, timestamp);
          
          // Phân tích và phát hiện cử chỉ chắp tay
          analyzeHands(results, canvas.width, canvas.height, showToast);

          // Vẽ khung xương tay AI (Nếu cấu hình bật)
          if (state.showSkeleton && results.landmarks) {
            results.landmarks.forEach((landmarks, index) => {
              // Phân biệt tay trái/tay phải từ metadata nếu có
              const isRight = results.handednesses && results.handednesses[index] 
                ? results.handednesses[index][0].categoryName === "Right" 
                : index === 0;
              drawHandSkeleton(ctx, landmarks, isRight, canvas.width, canvas.height);
            });
          }
        } catch (err) {
          console.error("Lỗi khi chạy nhận diện AI:", err);
        }
      }
    }

    // 3. Khôi phục context vẽ hiệu ứng (Particles & Ripples sẽ tự động lật gương theo)
    ctx.restore();

    // 4. Cập nhật và Vẽ hệ thống Hạt lấp lánh (Particles)
    state.particles.forEach((p, idx) => {
      p.update();
      p.draw(ctx);
      if (p.life <= 0) state.particles.splice(idx, 1);
    });

    // 5. Cập nhật và Vẽ hệ thống Sóng xung kích (Ripples)
    state.ripples.forEach((r, idx) => {
      r.update();
      r.draw(ctx);
      if (r.alpha <= 0 || r.radius >= r.maxRadius) state.ripples.splice(idx, 1);
    });

    // 5.5. Cập nhật và Vẽ chữ bay tích phước
    state.floatingTexts.forEach((ft, idx) => {
      ft.update();
      ft.draw(ctx);
      if (ft.life <= 0) state.floatingTexts.splice(idx, 1);
    });

    // 6. Vẽ hiệu ứng Hào quang nền (Background Halo) dịu nhẹ sau lưng khi đang chắp tay
    if (state.gestureActive && state.handLandmarker) {
      drawAmbientHalo(ctx, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(renderLoop);
}

// Bắt đầu khởi chạy ứng dụng
async function startApp() {
  console.log("[AuraApp] startApp() đã được gọi. readyState:", document.readyState);
  
  // Đặt cấu hình theme ban đầu cho body
  document.body.classList.add(`theme-${state.activePreset}`);

  // Cập nhật huy hiệu số phước tích lũy hiển thị lúc đầu
  const phuocDisplay = document.getElementById('phuoc-count-display');
  if (phuocDisplay) {
    phuocDisplay.innerText = state.phuocCount;
  }
  
  // 1. Tải mô hình AI
  console.log("[AuraApp] Bắt đầu tải mô hình AI...");
  await loadHandLandmarkerModel();
  console.log("[AuraApp] Tải mô hình AI xong. isModelLoaded:", state.isModelLoaded);
  
  // 2. Lấy quyền webcam
  console.log("[AuraApp] Bắt đầu khởi động Webcam...");
  const success = await setupWebcam(null, showToast);
  console.log("[AuraApp] Webcam setup result:", success);
  
  if (success) {
    // 3. Khởi tạo event listeners của UI
    setupUI();
    console.log("[AuraApp] UI đã được thiết lập.");

    // Lấy danh sách camera đầu vào
    await getCameraDevices();
    
    // Lắng nghe sự kiện cắm/rút thiết bị camera để cập nhật dropdown
    navigator.mediaDevices.ondevicechange = getCameraDevices;
    
    // Kích hoạt âm thanh khi click chuột lần đầu vào trang để tuân thủ chính sách trình duyệt
    document.body.addEventListener('click', () => {
      initAudio();
    }, { once: true });
    
    // 4. Khởi chạy vòng lặp dựng hình 60 FPS
    console.log("[AuraApp] Khởi chạy renderLoop 60 FPS!");
    renderLoop();
  } else {
    console.error("[AuraApp] Webcam setup thất bại! Ứng dụng không thể chạy.");
  }
}

// Khởi động khi DOM tải xong
// ES Modules được tải dạng "deferred" nên DOMContentLoaded có thể đã fire trước khi module load xong.
// Phải kiểm tra cả hai trường hợp để đảm bảo startApp() luôn được gọi.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  // DOM đã sẵn sàng rồi, gọi trực tiếp
  startApp();
}
