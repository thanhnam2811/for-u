// ── Lines 98 — Haptics Feedback ──

export const Haptics = {
  vibrate(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore potential security/permission exceptions in some contexts
      }
    }
  },

  /** Rung nhẹ 15ms khi chọn bóng hoặc bóng hạ cánh */
  light() {
    this.vibrate(15);
  },

  /** Rung đúp khi báo lỗi (không có đường đi) */
  error() {
    this.vibrate([40, 60, 40]);
  },

  /** Rung trung bình 60ms khi ghi điểm thành công */
  success() {
    this.vibrate(60);
  },

  /** Rung chuỗi nhịp điệu khi Game Over */
  gameOver() {
    this.vibrate([100, 100, 100, 100, 150]);
  }
};
