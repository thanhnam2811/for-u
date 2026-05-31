/**
 * dark-veil.js — Dark Veil "Sương Khói" mechanic
 *
 * Mỗi `darkIntervalMs` giây, màn hình bắt đầu phủ dần một lớp sương khói tối.
 * User chắp tay → hào quang bùng ra xóa vùng sương xung quanh người.
 * Màn hình không bao giờ tối quá MAX_DARK_OPACITY (sương khói huyền bí).
 * Khi đạt mức tối đa, giữ 5s rồi tự nhẹ lại một chút và chu kỳ tiếp tục.
 */

import { state, MAX_DARK_OPACITY, DARK_HOLD_MS, DARK_AUTO_CLEAR_OPACITY } from "./state.js";

// ─────────────────────────────────────────────────────────────────────────────
// Offscreen canvas để tạo hiệu ứng "destination-out" (đục lỗ trong sương)
// ─────────────────────────────────────────────────────────────────────────────
let darkCanvas = null;
let darkCtx    = null;
let veilWarning = null;
let veilProgress = null;

export function initDarkVeil() {
  darkCanvas = document.createElement('canvas');
  darkCtx    = darkCanvas.getContext('2d');
  veilWarning  = document.getElementById('veil-warning');
  veilProgress = document.getElementById('veil-progress-bar');

  // Bắt đầu chu kỳ đầu tiên ngay lập tức
  state.darkStartTime = performance.now();
  state.darkPhase     = 'growing';
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDarkVeil — gọi mỗi frame trong renderLoop
// ─────────────────────────────────────────────────────────────────────────────
export function updateDarkVeil(now) {
  // Đồng bộ kích thước offscreen canvas
  // (lazily, chỉ khi thay đổi để tránh clear liên tục)

  switch (state.darkPhase) {
    case 'idle':
      // Đợi đến lúc bắt đầu chu kỳ mới
      if (now - state.darkStartTime >= state.darkIntervalMs) {
        state.darkPhase     = 'growing';
        state.darkStartTime = now;
        _showVeilWarning(false);
      }
      break;

    case 'growing': {
      // Tăng dần opacity từ 0 → MAX_DARK_OPACITY trong darkGrowMs
      const elapsed = now - state.darkStartTime;
      const ratio   = Math.min(elapsed / state.darkGrowMs, 1);
      state.darkOpacity = MAX_DARK_OPACITY * _easeInQuad(ratio);

      // Cập nhật warning UI
      _updateWarningUI(ratio);

      if (ratio >= 1) {
        state.darkPhase          = 'holding';
        state.darkHoldStartTime  = now;
        _showVeilWarning(true);   // Cảnh báo đỏ khi đạt max
      }
      break;
    }

    case 'holding':
      // Giữ mức tối đa, sau DARK_HOLD_MS tự giảm nhẹ
      if (now - state.darkHoldStartTime >= DARK_HOLD_MS) {
        state.darkPhase = 'auto-clear';
        _showVeilWarning(false);
      }
      break;

    case 'auto-clear': {
      // Tự giảm nhẹ về DARK_AUTO_CLEAR_OPACITY trong 3s
      const elapsed = now - state.darkHoldStartTime - DARK_HOLD_MS;
      const ratio   = Math.min(elapsed / 3000, 1);
      state.darkOpacity = MAX_DARK_OPACITY - (MAX_DARK_OPACITY - DARK_AUTO_CLEAR_OPACITY) * ratio;
      if (ratio >= 1) {
        // Restart chu kỳ: idle → growing sau darkIntervalMs
        state.darkPhase     = 'idle';
        state.darkStartTime = now;
        state.darkOpacity   = DARK_AUTO_CLEAR_OPACITY;
      }
      break;
    }

    case 'clearing': {
      // User chắp tay → bán kính xóa lan rộng nhanh
      state.darkClearRadius += 35; // px mỗi frame
      const maxClearRadius = Math.hypot(
        Math.max(state.darkClearCenterX, darkCanvas?.width - state.darkClearCenterX || 9999),
        Math.max(state.darkClearCenterY, darkCanvas?.height - state.darkClearCenterY || 9999)
      );

      if (state.darkClearRadius >= maxClearRadius * 0.85) {
        // Đã xóa đủ → reset hoàn toàn, bắt đầu chu kỳ mới
        state.darkOpacity     = 0;
        state.darkClearRadius = 0;
        state.darkClearActive = false;
        state.darkPhase       = 'idle';
        state.darkStartTime   = now;
        _showVeilWarning(false);
      }
      break;
    }
  }

  // Giảm dần clearRadius nếu không còn clearing
  if (state.darkPhase !== 'clearing' && state.darkClearRadius > 0) {
    state.darkClearRadius = Math.max(0, state.darkClearRadius - 5);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// triggerVeilClear — gọi khi user chắp tay thành công
// ─────────────────────────────────────────────────────────────────────────────
export function triggerVeilClear(centerX, centerY) {
  if (state.darkOpacity < 0.01) return; // Không cần clear nếu chưa có sương

  state.darkClearCenterX = centerX;
  state.darkClearCenterY = centerY;
  state.darkClearRadius  = 0;
  state.darkClearActive  = true;
  state.darkPhase        = 'clearing';
  _showVeilWarning(false);
}

// ─────────────────────────────────────────────────────────────────────────────
// drawDarkVeil — vẽ lên main canvas
// ─────────────────────────────────────────────────────────────────────────────
export function drawDarkVeil(ctx, canvasWidth, canvasHeight) {
  if (state.darkOpacity < 0.005) return;

  // Đồng bộ kích thước offscreen canvas
  if (darkCanvas && (darkCanvas.width !== canvasWidth || darkCanvas.height !== canvasHeight)) {
    darkCanvas.width  = canvasWidth;
    darkCanvas.height = canvasHeight;
  }
  if (!darkCanvas || !darkCtx) return;

  // Vẽ lớp sương tối lên offscreen canvas
  darkCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Lớp sương khói với gradient nhẹ (đậm ở rìa, nhẹ hơn ở giữa — tạo cảm giác huyền bí)
  const fogGrad = darkCtx.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.1,
    canvasWidth / 2, canvasHeight / 2, Math.hypot(canvasWidth, canvasHeight) * 0.6
  );
  fogGrad.addColorStop(0, `rgba(5, 5, 20, ${state.darkOpacity * 0.5})`);    // Giữa nhẹ hơn
  fogGrad.addColorStop(0.5, `rgba(5, 5, 20, ${state.darkOpacity * 0.85})`);
  fogGrad.addColorStop(1, `rgba(5, 5, 20, ${state.darkOpacity})`);           // Rìa đậm nhất

  darkCtx.fillStyle = fogGrad;
  darkCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  // "Đục lỗ" tại vùng hào quang đã xóa (nếu đang clearing)
  if (state.darkClearRadius > 5) {
    darkCtx.save();
    darkCtx.globalCompositeOperation = 'destination-out';

    const clearGrad = darkCtx.createRadialGradient(
      state.darkClearCenterX, state.darkClearCenterY, 0,
      state.darkClearCenterX, state.darkClearCenterY, state.darkClearRadius
    );
    clearGrad.addColorStop(0,    'rgba(0, 0, 0, 1)');       // Trung tâm: xóa hoàn toàn
    clearGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.9)');     // Vẫn xóa mạnh
    clearGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.4)');     // Rìa xóa mờ dần
    clearGrad.addColorStop(1,    'rgba(0, 0, 0, 0)');        // Rìa ngoài: không xóa

    darkCtx.fillStyle = clearGrad;
    darkCtx.beginPath();
    darkCtx.arc(state.darkClearCenterX, state.darkClearCenterY, state.darkClearRadius, 0, Math.PI * 2);
    darkCtx.fill();
    darkCtx.restore();
  }

  // Vẽ offscreen canvas lên main canvas
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Easing helpers
// ─────────────────────────────────────────────────────────────────────────────
function _easeInQuad(t) {
  return t * t;
}

function _showVeilWarning(urgent) {
  if (!veilWarning) return;
  if (urgent) {
    veilWarning.classList.add('urgent');
  } else {
    veilWarning.classList.remove('urgent');
  }
}

function _updateWarningUI(ratio) {
  if (!veilWarning) return;

  // Hiện warning UI khi ratio > 40%
  if (ratio > 0.40) {
    veilWarning.classList.add('visible');
    if (veilProgress) {
      veilProgress.style.width = `${ratio * 100}%`;
    }
  } else {
    veilWarning.classList.remove('visible');
    veilWarning.classList.remove('urgent');
  }
}
