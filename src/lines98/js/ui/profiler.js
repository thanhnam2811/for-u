import { particleSystem } from '../fx/particles.js';

/**
 * Performance Profiler HUD.
 *
 * Toggle with backtick (`) key.
 * Displays: FPS, per-module timing (logic/render/particle), particle count, draw calls, memory.
 */
export const profiler = {
	visible: false,
	el: null,

	// FPS calculation
	frames: 0,
	lastFpsTime: 0,
	fps: 0,

	// Per-module timing (injected from game loop)
	logicTime: 0,
	renderTime: 0,
	particleTime: 0,
	fxTime: 0,
	drawCalls: 0,

	// Smoothing
	smoothLogic: 0,
	smoothRender: 0,
	smoothParticle: 0,
	smoothFx: 0,

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
      line-height: 1.6;
      color: #0f0;
      background: rgba(0,0,0,0.7);
      border: 1px solid rgba(0,255,0,0.2);
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 160px;
      pointer-events: none;
      user-select: none;
      display: none;
      backdrop-filter: blur(4px);
    `;
		this.el.innerHTML = `
      <div>FPS: <span id="prof-fps">--</span></div>
      <div>Frame: <span id="prof-frame">--</span>ms</div>
      <div>├ Logic: <span id="prof-logic">--</span>ms</div>
      <div>├ Render: <span id="prof-render">--</span>ms</div>
      <div>├ FX: <span id="prof-fx">--</span>ms</div>
      <div>├ Particles: <span id="prof-particles-ms">--</span>ms</div>
      <div>├ DrawCalls: <span id="prof-drawcalls">0</span></div>
      <div>└ Particles: <span id="prof-particles">0</span></div>
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

		// Smooth timing values (EMA)
		const alpha = 0.3;
		this.smoothLogic += (this.logicTime - this.smoothLogic) * alpha;
		this.smoothRender += (this.renderTime - this.smoothRender) * alpha;
		this.smoothParticle += (this.particleTime - this.smoothParticle) * alpha;
		this.smoothFx += (this.fxTime - this.smoothFx) * alpha;

		// Update DOM
		const setText = (id, val) => {
			const el = document.getElementById(id);
			if (el) el.textContent = val;
		};
		setText('prof-fps', this.fps);
		setText('prof-frame', dt.toFixed(1));
		setText('prof-logic', this.smoothLogic.toFixed(2));
		setText('prof-render', this.smoothRender.toFixed(2));
		setText('prof-fx', this.smoothFx.toFixed(2));
		setText('prof-particles-ms', this.smoothParticle.toFixed(2));
		setText('prof-drawcalls', this.drawCalls);

		const count = particleSystem.particles ? particleSystem.particles.length : 0;
		setText('prof-particles', count);

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

	/**
	 * Reset per-frame counters (call at start of game loop).
	 */
	resetFrame() {
		this.logicTime = 0;
		this.renderTime = 0;
		this.particleTime = 0;
		this.fxTime = 0;
		this.drawCalls = 0;
	}
};
