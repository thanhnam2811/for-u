import { state } from '../core/state.js';

export const Sound = {
  ctx: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.error("Web Audio API not supported:", err);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  _tone(freq, duration, type = 'sine', vol = 0.15) {
    if (!state.soundEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(vol, t);
    // Smooth decay exponential curve
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  select() {
    this._tone(880, 0.12, 'sine', 0.1);
    setTimeout(() => this._tone(1100, 0.08, 'sine', 0.06), 40);
  },

  deselect() {
    this._tone(440, 0.1, 'sine', 0.08);
  },

  moveStep() {
    this._tone(600 + Math.random() * 150, 0.03, 'triangle', 0.04);
  },

  land() {
    this._tone(350, 0.12, 'sine', 0.08);
    this._tone(250, 0.15, 'triangle', 0.05);
  },

  clear(count) {
    // Beautiful ascending major chord arpeggio based on cleared count
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00]; // C5, E5, G5, C6...
    for (let i = 0; i < Math.min(count, notes.length); i++) {
      setTimeout(() => {
        this._tone(notes[i], 0.25, 'sine', 0.08);
      }, i * 60);
    }
  },

  spawn() {
    [0, 80, 160].forEach((delay, i) => {
      setTimeout(() => {
        this._tone(330 + i * 55, 0.08, 'triangle', 0.05);
      }, delay);
    });
  },

  noPath() {
    this._tone(180, 0.15, 'sawtooth', 0.05);
    setTimeout(() => this._tone(150, 0.15, 'sawtooth', 0.05), 100);
  },

  heartbeat(tempo = 1.0) {
    // Low double heart thuds
    this._tone(65, 0.15, 'triangle', 0.2);
    setTimeout(() => {
      this._tone(60, 0.18, 'triangle', 0.18);
    }, 150 * tempo);
  },

  gameOver() {
    [392, 349.23, 311.13, 261.63].forEach((freq, i) => {
      setTimeout(() => {
        this._tone(freq, 0.4, 'sine', 0.08);
      }, i * 200);
    });
  },

  undo() {
    this._tone(440, 0.08, 'triangle', 0.06);
    this._tone(380, 0.1, 'triangle', 0.05);
  }
};
export default Sound;
