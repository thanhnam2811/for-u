// Nạp thư viện MediaPipe Hand Landmarker qua CDN ES Module
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";

// === CÁC THAM CHIẾU DOM CHÍNH ===
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas-overlay');
const ctx = canvas.getContext('2d');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const progressBar = document.getElementById('progress-bar');
const cameraSelect = document.getElementById('camera-select');
const colorBtns = document.querySelectorAll('.color-btn');
const soundBtns = document.querySelectorAll('.sound-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumeVal = document.getElementById('volume-val');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const sensitivityVal = document.getElementById('sensitivity-val');
const toggleSkeleton = document.getElementById('toggle-skeleton');
const toggleMirror = document.getElementById('toggle-mirror');
const btnScreenshot = document.getElementById('btn-screenshot');
const flashEffect = document.getElementById('flash-effect');
const toastNotification = document.getElementById('toast-notification');
const cameraWrapper = document.getElementById('camera-wrapper');
const gestureInstruction = document.getElementById('gesture-instruction');
const gestureTriggeredMsg = document.getElementById('gesture-triggered-msg');

// Các thông số hiển thị kỹ thuật
const statFps = document.getElementById('stat-fps');
const statHands = document.getElementById('stat-hands');
const statDist = document.getElementById('stat-dist');

// === TRẠNG THÁI CỦA ỨNG DỤNG ===
let handLandmarker = null;
let webcamStream = null;
let lastVideoTime = -1;
let isModelLoaded = false;
let isCameraActive = false;

// Cấu hình người dùng (Mặc định)
let activePreset = 'gold'; // gold, cosmic, lotus, emerald
let activeSound = 'gong'; // gong, chime, bowl, mute
let volume = 0.7;
let sensitivityThreshold = 0.20; // Khoảng cách chuẩn hóa để tính là chắp tay (0.10 -> 0.30)
let showSkeleton = true;
let mirrorCamera = true;

// Trạng thái nhận diện
let gestureActive = false;
let distanceNormalized = 999;
let lastHandsDetected = 0;

// Tính FPS
let lastFrameTime = performance.now();
let frameCount = 0;
let currentFps = 0;

// Hệ thống hạt & sóng
let particles = [];
let ripples = [];
let continuousSparkleTimer = 0;

// Bộ tổng hợp âm thanh Web Audio API
let audioCtx = null;

// === KHỞI TẠO ÂM THANH (WEB AUDIO API) ===
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Bảng tần số họa âm cho các loại chuông
const SOUND_PRESETS = {
  gong: {
    // Chuông khánh chùa trầm ấm ngân vang
    baseFreq: 110,
    partials: [220, 314, 480, 620, 780],
    gains: [1.0, 0.4, 0.3, 0.15, 0.08, 0.03],
    decays: [3.8, 2.5, 2.0, 1.2, 0.8, 0.4],
    type: 'sine'
  },
  chime: {
    // Chuông gió phép thuật lung linh, trong trẻo
    baseFreq: 880,
    partials: [1100, 1320, 1540, 1760, 2200],
    gains: [1.0, 0.6, 0.5, 0.3, 0.2, 0.1],
    decays: [1.5, 1.2, 1.0, 0.8, 0.6, 0.4],
    type: 'triangle'
  },
  bowl: {
    // Chuông xoay Tây Tạng sâu lắng, thiền định
    baseFreq: 220,
    partials: [330, 440, 660],
    gains: [1.0, 0.5, 0.3, 0.1],
    decays: [4.0, 3.0, 2.0, 1.0],
    type: 'sine',
    lfo: { freq: 4.5, depth: 0.15 } // Bộ tạo độ rung chấn
  }
};

function playZenSound() {
  if (activeSound === 'mute') return;
  initAudio();
  
  const now = audioCtx.currentTime;
  const config = SOUND_PRESETS[activeSound];
  if (!config) return;

  // Lắp bộ tổng hợp (Synthesizer)
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  // Fade in cực nhanh để không bị nổ tiếng bụp
  masterGain.gain.linearRampToValueAtTime(volume, now + 0.01);
  masterGain.connect(audioCtx.destination);

  // Bộ lọc để tiếng ấm hơn
  const filter = audioCtx.createBiquadFilter();
  filter.type = activeSound === 'chime' ? 'highpass' : 'lowpass';
  filter.frequency.setValueAtTime(activeSound === 'chime' ? 500 : 1200, now);
  filter.connect(masterGain);

  // LFO tạo rung chấn cho Chuông xoay (Singing Bowl)
  let lfo = null;
  let lfoGain = null;
  if (config.lfo) {
    lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(config.lfo.freq, now);
    
    lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(config.lfo.depth, now);
    
    lfo.connect(lfoGain);
    // Điều chế âm lượng
    lfoGain.connect(masterGain.gain);
    lfo.start(now);
  }

  // Tạo Oscillator chính và các họa âm (overtones)
  const oscs = [];
  const gains = [];

  // Tạo tần số gốc
  createPartial(config.baseFreq, config.gains[0], config.decays[0], config.type);

  // Tạo các họa âm
  config.partials.forEach((freq, idx) => {
    createPartial(freq, config.gains[idx + 1] || 0.1, config.decays[idx + 1] || 1.0, config.type);
  });

  function createPartial(frequency, gainVal, decayTime, type) {
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();

    osc.type = type;
    // Cho lệch tần số một xíu xiu tạo độ dày âm (Chorusing)
    osc.frequency.setValueAtTime(frequency + (Math.random() - 0.5) * 1.5, now);
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(gainVal, now + 0.02);
    // Tắt dần theo đường cong hàm mũ
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

    osc.connect(oscGain);
    oscGain.connect(filter);
    
    osc.start(now);
    // Dọn dẹp bộ nhớ khi âm thanh kết thúc
    osc.stop(now + decayTime + 0.5);
    
    oscs.push(osc);
    gains.push(oscGain);
  }
}

// === HỆ THỐNG VẼ HIỆU ỨNG CANVAS VỚI TỐC ĐỘ 60 FPS ===

// Định nghĩa màu sắc lấp lánh cho từng Pháp Bảo
const THEME_COLORS = {
  gold: {
    primary: '#ffd700',
    secondary: '#ffe066',
    sparkles: ['#ffd700', '#ffffff', '#ffe066', '#cca300', '#fff3cc'],
    ripple: 'rgba(255, 215, 0, 0.4)'
  },
  cosmic: {
    primary: '#d05eff',
    secondary: '#ecb3ff',
    sparkles: ['#d05eff', '#ffffff', '#ecb3ff', '#8c00cc', '#f3d9ff'],
    ripple: 'rgba(208, 94, 255, 0.45)'
  },
  lotus: {
    primary: '#ff7ebb',
    secondary: '#ffb3d9',
    sparkles: ['#ff7ebb', '#ffffff', '#ffb3d9', '#cc3377', '#ffe6f2'],
    ripple: 'rgba(255, 126, 187, 0.4)'
  },
  emerald: {
    primary: '#2effa2',
    secondary: '#a8ffd3',
    sparkles: ['#2effa2', '#ffffff', '#a8ffd3', '#00cc66', '#e6fff2'],
    ripple: 'rgba(46, 255, 162, 0.4)'
  }
};

class Particle {
  constructor(x, y, theme) {
    this.x = x;
    this.y = y;
    // Bắn hạt ra mọi hướng ngẫu nhiên dạng tròn
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 8.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5; // Xu hướng bay nhẹ lên trên
    
    this.size = 2 + Math.random() * 8;
    this.colorList = THEME_COLORS[theme].sparkles;
    this.color = this.colorList[Math.floor(Math.random() * this.colorList.length)];
    
    this.alpha = 1.0;
    this.maxLife = 35 + Math.random() * 45; // Số frames tồn tại
    this.life = this.maxLife;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Giảm tốc độ ma sát
    this.vx *= 0.96;
    this.vy *= 0.96;
    
    this.life--;
    this.alpha = this.life / this.maxLife;
    this.size *= 0.97; // Hạt nhỏ dần đi
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = this.color;
    
    // Vẽ vầng sáng nhòe nhẹ cho hạt (nhưng tối ưu hóa hiệu năng)
    context.shadowBlur = this.size * 1.5;
    context.shadowColor = this.color;
    
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

class Ripple {
  constructor(x, y, theme) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = Math.max(canvas.width, canvas.height) * 0.9;
    this.themeColors = THEME_COLORS[theme];
    this.color = this.themeColors.primary;
    this.alpha = 1.0;
    this.speed = 12 + Math.random() * 4; // Tốc độ lan tỏa
  }

  update() {
    this.radius += this.speed;
    this.alpha = 1 - (this.radius / this.maxRadius);
    this.speed *= 0.97; // Sóng lan tỏa chậm dần đi
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.alpha;
    context.strokeStyle = this.color;
    // Nét vẽ mỏng dần đi khi tỏa rộng
    context.lineWidth = 1 + 8 * (1 - this.radius / this.maxRadius);
    
    // Vẽ vầng hào quang phát sáng (glow)
    context.shadowBlur = 20;
    context.shadowColor = this.color;
    
    // Sóng tròn lan tỏa dạng elip hoặc tròn
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

// Bắn hiệu ứng hào quang lớn
function triggerAuraEffects(midX, midY) {
  // 1. Chớp màn hình lóa sáng nhẹ kiểu thức tỉnh
  flashEffect.classList.add('flash');
  setTimeout(() => {
    flashEffect.classList.remove('flash');
  }, 80);

  // 2. Thêm lớp viền phát sáng ở khung camera
  cameraWrapper.classList.add('aura-active');
  gestureInstruction.classList.add('hidden');
  gestureTriggeredMsg.classList.add('active');
  
  setTimeout(() => {
    cameraWrapper.classList.remove('aura-active');
    gestureTriggeredMsg.classList.remove('active');
    // Chỉ hiển thị lại hướng dẫn nếu không còn giữ tay chắp
    if (!gestureActive) {
      gestureInstruction.classList.remove('hidden');
    }
  }, 2200);

  // 3. Khởi tạo 200 hạt ánh sáng bắn ra từ tay
  for (let i = 0; i < 200; i++) {
    particles.push(new Particle(midX, midY, activePreset));
  }

  // 4. Khởi tạo 3 đợt sóng xung kích lan rộng
  ripples.push(new Ripple(midX, midY, activePreset));
  setTimeout(() => {
    ripples.push(new Ripple(midX, midY, activePreset));
  }, 200);
  setTimeout(() => {
    ripples.push(new Ripple(midX, midY, activePreset));
  }, 450);

  // 5. Phát tiếng chuông thiền
  playZenSound();

  // 6. Hiển thị Toast thông báo
  showToast("🙏 Hào quang đã kích hoạt thành công! 🙏");
}

// Vẽ bộ khung xương tay AI (Landmarks) bằng hiệu ứng neon
function drawHandSkeleton(landmarks, isRightHand) {
  ctx.save();
  // Màu sắc khung xương đổi theo hệ Hào Quang
  const theme = THEME_COLORS[activePreset];
  ctx.strokeStyle = isRightHand ? theme.primary : theme.secondary;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  
  // Vầng phát sáng neon cho khung xương
  ctx.shadowBlur = 10;
  ctx.shadowColor = ctx.strokeStyle;

  // Bản đồ các khớp xương nối nhau trong MediaPipe Hands
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Ngón cái
    [0, 5], [5, 6], [6, 7], [7, 8], // Ngón trỏ
    [5, 9], [9, 10], [10, 11], [11, 12], // Ngón giữa
    [9, 13], [13, 14], [14, 15], [15, 16], // Ngón áp út
    [13, 17], [17, 18], [18, 19], [19, 20], // Ngón út
    [0, 17] // Khớp lòng bàn tay dưới
  ];

  // Vẽ các nét nối xương
  connections.forEach(([i, j]) => {
    const pt1 = landmarks[i];
    const pt2 = landmarks[j];
    
    ctx.beginPath();
    ctx.moveTo(pt1.x * canvas.width, pt1.y * canvas.height);
    ctx.lineTo(pt2.x * canvas.width, pt2.y * canvas.height);
    ctx.stroke();
  });

  // Vẽ các khớp hạt ngọc sáng lấp lánh ở đầu ngón tay
  ctx.fillStyle = '#ffffff';
  landmarks.forEach((pt, index) => {
    ctx.beginPath();
    // Vẽ to hơn ở đầu ngón tay
    const size = [4, 8, 12, 16, 20].includes(index) ? 5 : 3;
    ctx.arc(pt.x * canvas.width, pt.y * canvas.height, size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// === THUẬT TOÁN NHẬN DIỆN CỬ CHỈ CHẮP TAY (PRAY GESTURE) ===
function analyzeHands(handResults) {
  const detectedCount = handResults.landmarks ? handResults.landmarks.length : 0;
  statHands.innerText = `${detectedCount}/2`;
  
  if (detectedCount < 2) {
    // Không đủ 2 tay -> Đặt lại trạng thái khoảng cách
    distanceNormalized = 999;
    statDist.innerText = "--";
    
    if (gestureActive) {
      // Nếu tay bị tách ra đột ngột
      gestureActive = false;
      gestureInstruction.classList.remove('hidden');
    }
    return;
  }

  // Có ít nhất 2 bàn tay trên màn hình
  const hand1 = handResults.landmarks[0];
  const hand2 = handResults.landmarks[1];

  // 1. Tính toán kích thước trung bình lòng bàn tay để chuẩn hóa
  // Đo khoảng cách từ Cổ tay (0) đến Khớp gốc ngón giữa (9) của từng bàn tay
  const getHandScale = (hand) => {
    const dx = hand[9].x - hand[0].x;
    const dy = hand[9].y - hand[0].y;
    return Math.sqrt(dx*dx + dy*dy);
  };
  const scale = (getHandScale(hand1) + getHandScale(hand2)) / 2;

  // 2. Tính khoảng cách thực tế giữa các điểm quan trọng tương ứng của 2 bàn tay:
  // - Điểm cổ tay (0)
  // - Khớp gốc ngón trỏ (5)
  // - Khớp gốc ngón út (17)
  const getDistance = (pt1, pt2) => {
    const dx = pt1.x - pt2.x;
    const dy = pt1.y - pt2.y;
    return Math.sqrt(dx*dx + dy*dy);
  };

  const distWrist = getDistance(hand1[0], hand2[0]);
  const distIndex = getDistance(hand1[5], hand2[5]);
  const distPinky = getDistance(hand1[17], hand2[17]);

  // Lấy khoảng cách trung bình
  const avgDistance = (distWrist + distIndex + distPinky) / 3;

  // 3. Chuẩn hóa khoảng cách (chia cho tỉ lệ tay) để loại bỏ sai số xa gần
  distanceNormalized = avgDistance / scale;
  statDist.innerText = distanceNormalized.toFixed(2);

  // Vị trí trung tâm giữa 2 bàn tay (để làm tâm phát hào quang)
  const midX = ((hand1[9].x + hand2[9].x) / 2) * canvas.width;
  const midY = ((hand1[9].y + hand2[9].y) / 2) * canvas.height;

  // 4. Bộ so sánh ngưỡng kích hoạt chắp tay
  if (distanceNormalized < sensitivityThreshold) {
    if (!gestureActive) {
      // Đã chạm tay (Chắp tay niệm Phật thành công!)
      gestureActive = true;
      triggerAuraEffects(midX, midY);
    } else {
      // Tiếp tục duy trì chắp tay -> Rơi nhẹ vài hạt bụi vàng lấp lánh xung quanh tay
      continuousSparkleTimer++;
      if (continuousSparkleTimer % 2 === 0) {
        particles.push(new Particle(midX + (Math.random() - 0.5) * 40, midY + (Math.random() - 0.5) * 40, activePreset));
      }
    }
  } else if (distanceNormalized > (sensitivityThreshold + 0.10)) {
    // Đã tách tay hẳn ra ngoài (áp dụng trễ chống lặp chấn động)
    if (gestureActive) {
      gestureActive = false;
      gestureInstruction.classList.remove('hidden');
    }
  }
}

// === VÒNG LẶP RENDER KHUNG HÌNH (ANIMATION LOOP) ===
function renderLoop() {
  // Tính toán FPS thực tế
  const now = performance.now();
  frameCount++;
  if (now > lastFrameTime + 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFrameTime));
    statFps.innerText = currentFps;
    frameCount = 0;
    lastFrameTime = now;
  }

  // Xóa sạch canvas chuẩn bị vẽ
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (video.readyState >= 2) {
    // Đồng bộ kích thước canvas theo kích thước hiển thị thực tế của webcam
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // 1. Vẽ trực tiếp Webcam làm nền lên Canvas trước
    ctx.save();
    if (mirrorCamera) {
      // Hiệu ứng lật gương webcam để người dùng chắp tay tự nhiên nhất
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Chạy AI dò bàn tay nếu mô hình đã sẵn sàng
    if (isModelLoaded) {
      let timestamp = performance.now();
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        try {
          const results = handLandmarker.detectForVideo(video, timestamp);
          
          // Phân tích và phát hiện cử chỉ chắp tay
          analyzeHands(results);

          // Vẽ khung xương tay AI (Nếu cấu hình bật)
          if (showSkeleton && results.landmarks) {
            results.landmarks.forEach((landmarks, index) => {
              // Phân biệt tay trái/tay phải từ metadata nếu có
              const isRight = results.handednesses && results.handednesses[index] 
                ? results.handednesses[index][0].categoryName === "Right" 
                : index === 0;
              drawHandSkeleton(landmarks, isRight);
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
    particles.forEach((p, idx) => {
      p.update();
      p.draw(ctx);
      if (p.life <= 0) particles.splice(idx, 1);
    });

    // 5. Cập nhật và Vẽ hệ thống Sóng xung kích (Ripples)
    ripples.forEach((r, idx) => {
      r.update();
      r.draw(ctx);
      if (r.alpha <= 0 || r.radius >= r.maxRadius) ripples.splice(idx, 1);
    });

    // 6. Vẽ hiệu ứng Hào quang nền (Background Halo) dịu nhẹ sau lưng khi đang chắp tay
    if (gestureActive && handLandmarker) {
      drawAmbientHalo();
    }
  }

  requestAnimationFrame(renderLoop);
}

// Vẽ một vầng sáng dịu dạng đài sen lung linh xung quanh
function drawAmbientHalo() {
  ctx.save();
  const theme = THEME_COLORS[activePreset];
  
  // Tạo gradient tròn tỏa sáng
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 20,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.7
  );
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.3, 'rgba(' + hexToRgb(theme.primary) + ', 0.15)');
  gradient.addColorStop(0.6, 'rgba(' + hexToRgb(theme.primary) + ', 0.05)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'screen'; // Chế độ hòa trộn màu sáng
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.restore();
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '255, 215, 0';
}

// === KHỞI ĐỘNG WEBCAM VÀ CẤP QUYỀN TRÌNH DUYỆT ===
async function setupWebcam(deviceId = null) {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
  }

  isCameraActive = false;
  
  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" },
    audio: false
  };

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = webcamStream;
    
    // Đợi luồng webcam nạp dữ liệu xong
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve();
      };
    });
    
    isCameraActive = true;
    console.log("Khởi động webcam thành công!");
    return true;
  } catch (err) {
    console.error("Không thể mở webcam:", err);
    showToast("⚠️ Lỗi: Không thể truy cập Camera. Vui lòng cấp quyền!");
    loadingStatus.innerText = "Lỗi: Không truy cập được Camera. Vui lòng cấp quyền và tải lại trang.";
    return false;
  }
}

// Dò tìm danh sách các thiết bị video đầu vào
async function getCameraDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
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
  } catch (err) {
    console.error("Không thể lấy danh sách camera:", err);
  }
}

// === TẢI MÔ HÌNH AI MEDIAPIPE HAND LANDMARKER ===
async function loadHandLandmarkerModel() {
  loadingStatus.innerText = "Đang tải thư viện nhận diện AI...";
  progressBar.style.width = "30%";

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );
    
    progressBar.style.width = "60%";
    loadingStatus.innerText = "Đang cấu hình mô hình hiệu ứng...";

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2 // Nhận diện tối đa 2 tay để làm cử chỉ chắp tay
    });

    progressBar.style.width = "100%";
    loadingStatus.innerText = "Hoàn thành! Đang bắt đầu khởi động...";
    console.log("Khởi tạo MediaPipe HandLandmarker thành công!");
    
    isModelLoaded = true;
    
    // Ẩn màn hình tải sau khi hoàn tất mọi thứ
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 800);
    
  } catch (err) {
    console.error("Lỗi khi tải mô hình MediaPipe:", err);
    loadingStatus.innerText = "Lỗi khi nạp mô hình AI. Vui lòng tải lại trang hoặc kiểm tra kết nối mạng.";
    progressBar.style.backgroundColor = "#ff4d4d";
  }
}

// === XỬ LÝ SỰ KIỆN TƯƠNG TÁC GIAO DIỆN (UI EVENTS) ===

// Đổi bộ lọc tông màu hào quang
colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const preset = btn.dataset.preset;
    activePreset = preset;
    
    // Đổi class theme ở thẻ body
    document.body.className = ''; // Xóa các theme cũ
    document.body.classList.add(`theme-${preset}`);
    
    showToast(`Đã chuyển sang: Hào quang ${btn.innerText.trim()}`);
  });
});

// Đổi kiểu âm thanh thiền định
soundBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    soundBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeSound = btn.dataset.sound;
    
    // Kích hoạt thử âm thanh
    initAudio();
    if (activeSound !== 'mute') {
      playZenSound();
      showToast(`Đã chọn âm thanh: ${btn.innerText.trim()}`);
    } else {
      showToast("Đã tắt âm thanh");
    }
  });
});

// Slider Âm lượng
volumeSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  volume = val / 100;
  volumeVal.innerText = `${val}%`;
});

// Slider Độ nhạy AI
sensitivitySlider.addEventListener('input', (e) => {
  const val = e.target.value;
  // Ánh xạ tuyến tính nghịch đảo từ giá trị slider (10 -> 30) sang khoảng cách (0.30 -> 0.10)
  // Nghĩa là: Slider càng cao thì khoảng cách chắp tay yêu cầu càng hẹp -> Khó hơn / độ nhạy ảo thực tế hơn
  // Nhưng để thân thiện với người dùng: slider càng cao càng "Nhạy" -> ngưỡng khoảng cách cho phép càng lớn
  // Ngưỡng từ 0.12 (khó) đến 0.28 (dễ dàng)
  sensitivityThreshold = 0.08 + (val / 100);
  
  let label = "Bình thường";
  if (val < 15) label = "Khó chắp";
  else if (val >= 15 && val <= 22) label = "Khá nhạy";
  else label = "Cực kỳ nhạy";
  
  sensitivityVal.innerText = label;
});

// Bật/tắt hiện xương tay AI
toggleSkeleton.addEventListener('change', (e) => {
  showSkeleton = e.target.checked;
  showToast(showSkeleton ? "Bật bộ xương tay AI" : "Ẩn bộ xương tay AI");
});

// Bật/tắt lật gương camera
toggleMirror.addEventListener('change', (e) => {
  mirrorCamera = e.target.checked;
  if (mirrorCamera) {
    video.classList.remove('no-mirror');
  } else {
    video.classList.add('no-mirror');
  }
  showToast(mirrorCamera ? "Đã bật lật gương" : "Đã tắt lật gương");
});

// Thay đổi camera đầu vào từ dropdown
cameraSelect.addEventListener('change', async (e) => {
  const deviceId = e.target.value;
  if (deviceId) {
    showToast("Đang chuyển đổi Camera...");
    await setupWebcam(deviceId);
  }
});

// Chụp ảnh hào quang lấp lánh (Screenshot)
btnScreenshot.addEventListener('click', () => {
  if (!isCameraActive) return;
  
  // Phát ra tiếng màn trập camera ảo bằng Web Audio API
  if (activeSound !== 'mute') {
    initAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Chụp ảnh từ canvas (Chứa cả webcam mặt người dùng + xương tay neon + hào quang rực rỡ)
  try {
    const dataUrl = canvas.toDataURL("image/png");
    
    // Tạo phần tử tải ảnh ảo
    const downloadLink = document.createElement("a");
    downloadLink.href = dataUrl;
    
    // Tên file lưu cực kỳ lãng mạn
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadLink.download = `hao-quang-ho-the-${dateStr}.png`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showToast("📸 Đã chụp ảnh và lưu về máy thành công!");
  } catch (err) {
    console.error("Lỗi khi chụp ảnh màn hình:", err);
    showToast("❌ Không thể chụp ảnh do giới hạn CORS!");
  }
});

// Toast thông báo xinh xắn
let toastTimer = null;
function showToast(message) {
  clearTimeout(toastTimer);
  toastNotification.innerText = message;
  toastNotification.classList.add('show');
  
  toastTimer = setTimeout(() => {
    toastNotification.classList.remove('show');
  }, 2500);
}

// === BẮT ĐẦU CHẠY ỨNG DỤNG ===
async function startApp() {
  // Đặt cấu hình theme ban đầu
  document.body.classList.add(`theme-${activePreset}`);
  
  // 1. Tải mô hình AI
  await loadHandLandmarkerModel();
  
  // 2. Lấy quyền webcam
  const success = await setupWebcam();
  
  if (success) {
    // Lấy danh sách camera
    await getCameraDevices();
    
    // Lắng nghe sự kiện cắm/rút thiết bị camera để cập nhật lại danh sách dropdown
    navigator.mediaDevices.ondevicechange = getCameraDevices;
    
    // Kích hoạt âm thanh khi click chuột lần đầu vào trang để tuân thủ chính sách trình duyệt
    document.body.addEventListener('click', () => {
      initAudio();
    }, { once: true });
    
    // 3. Khởi chạy vòng lặp dựng hình
    renderLoop();
  }
}

// Bắt đầu ứng dụng khi DOM tải xong
document.addEventListener('DOMContentLoaded', startApp);
