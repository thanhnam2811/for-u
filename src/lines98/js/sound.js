// ── Lines 98 — Sound Manager (Web Audio API) ──

export const Sound = {
  ctx: null,
  enabled: true,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { this.enabled = false; }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  _tone(freq, duration, type = 'sine', vol = 0.15) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  select() {
    this._tone(880, 0.1, 'sine', 0.12);
    setTimeout(() => this._tone(1100, 0.08, 'sine', 0.08), 40);
  },
  deselect() { this._tone(500, 0.08, 'sine', 0.08); },
  moveStep() { this._tone(600 + Math.random() * 200, 0.04, 'triangle', 0.05); },
  land() { this._tone(350, 0.12, 'sine', 0.1); this._tone(280, 0.15, 'triangle', 0.06); },
  lineClear(count) {
    const notes = [523, 659, 784, 988, 1175, 1318, 1568];
    for (let i = 0; i < Math.min(count, notes.length); i++)
      setTimeout(() => this._tone(notes[i], 0.2, 'sine', 0.1), i * 70);
  },
  spawn() {
    [0, 80, 160].forEach((d, i) =>
      setTimeout(() => this._tone(440 + i * 60, 0.1, 'triangle', 0.06), d));
  },
  noPath() {
    this._tone(200, 0.15, 'square', 0.06);
    setTimeout(() => this._tone(170, 0.15, 'square', 0.06), 100);
  },
  gameOver() {
    [400, 350, 300, 250].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.35, 'sine', 0.1), i * 180));
  },
  newRecord() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.25, 'sine', 0.12), i * 120));
  },
  undo() { this._tone(440, 0.08, 'triangle', 0.08); this._tone(380, 0.1, 'triangle', 0.06); },
  hint() { this._tone(660, 0.12, 'sine', 0.1); setTimeout(() => this._tone(880, 0.12, 'sine', 0.08), 100); },
  checkpoint() { this._tone(523, 0.1, 'sine', 0.1); setTimeout(() => this._tone(784, 0.15, 'sine', 0.1), 80); },
};
