import { particleSystem } from '../fx/particles.js';

/**
 * Performance Profiler HUD.
 *
 * Toggle with backtick (`) key.
 * Displays: FPS, frame time, particle count, memory estimate.
 */
export const profiler = {
  visible: false,
  el: null,

  // FPS calculation
  frames: 0,
  lastFpsTime: 0,
  fps: 0,

  // Timing
  lastFrameTime: 0,
  frameHistory: [],

  initialize() {
    // Create overlay element
    this.el = document.createElement('div');
    this.el.id = 'profiler-hud';
    this.el.style.cssText = `
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 9999;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #0f0;
      background: rgba(0,0,0,0.7);
      border: 1px solid rgba(0,255,0,0.2);
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 140px;
      pointer-events: none;
      user-select: none;
      display: none;
      backdrop-filter: blur(4px);
    `;
    this.el.innerHTML = `
      <div>FPS: <span id="prof-fps">--</span></div>
      <div>Frame: <span id="prof-frame">--</span>ms</div>
      <div>Particles: <span id="prof-particles">0</span></div>
      <div>Mem: <span id="prof-mem">--</span></div>
    `;
    document.body.appendChild(this.el);

    // Toggle with backtick key
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === 'Backquote') {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  toggle() {
    this.visible = !this.visible;
    if (this.el) {
      this.el.style.display = this.visible ? 'block' : 'none';
    }
    if (!this.visible) {
      this.frames = 0;
      this.lastFpsTime = 0;
    }
  },

  /**
   * Call every frame from the game loop.
   * @param {number} dt - Delta time in ms
   * @param {number} now - performance.now() timestamp
   */
  update(dt, now) {
    if (!this.visible) return;

    // FPS counter
    this.frames++;
    if (this.lastFpsTime === 0) {
      this.lastFpsTime = now;
    }
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 500) {
      this.fps = Math.round((this.frames / elapsed) * 1000);
      this.frames = 0;
      this.lastFpsTime = now;
    }

    // Update DOM
    const fpsEl = document.getElementById('prof-fps');
    if (fpsEl) fpsEl.textContent = this.fps;

    const frameEl = document.getElementById('prof-frame');
    if (frameEl) frameEl.textContent = dt.toFixed(1);

    const particleEl = document.getElementById('prof-particles');
    if (particleEl) {
      const count = particleSystem.particles ? particleSystem.particles.length : 0;
      particleEl.textContent = count;
    }

    // Memory estimate (Chrome-only)
    const memEl = document.getElementById('prof-mem');
    if (memEl) {
      if (performance.memory) {
        const mb = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        memEl.textContent = `${mb} MB`;
      } else {
        memEl.textContent = 'N/A';
      }
    }
  },
};
