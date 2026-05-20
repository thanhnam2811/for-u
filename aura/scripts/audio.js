import { state } from "./state.js";
import { SOUND_PRESETS } from "./constants.js";

// Khởi tạo âm thanh Web Audio API (Tuân thủ bảo mật trình duyệt)
export function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

// Phát âm thanh chuông thiền tùy chọn
export function playZenSound() {
  if (state.activeSound === 'mute') return;
  initAudio();
  
  const now = state.audioCtx.currentTime;
  const config = SOUND_PRESETS[state.activeSound];
  if (!config) return;

  // Lắp bộ tổng hợp (Synthesizer Gain)
  const masterGain = state.audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  // Fade-in cực nhanh để không bị nổ tiếng bụp
  masterGain.gain.linearRampToValueAtTime(state.volume, now + 0.01);
  masterGain.connect(state.audioCtx.destination);

  // Bộ lọc Filter ấm áp
  const filter = state.audioCtx.createBiquadFilter();
  filter.type = state.activeSound === 'chime' ? 'highpass' : 'lowpass';
  filter.frequency.setValueAtTime(state.activeSound === 'chime' ? 500 : 1200, now);
  filter.connect(masterGain);

  // LFO rung chấn cho Singing Bowl
  let lfo = null;
  let lfoGain = null;
  if (config.lfo) {
    lfo = state.audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(config.lfo.freq, now);
    
    lfoGain = state.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(config.lfo.depth, now);
    
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start(now);
  }

  const oscs = [];
  const gains = [];

  // Tạo tần số gốc
  createPartial(config.baseFreq, config.gains[0], config.decays[0], config.type);

  // Tạo các họa âm
  config.partials.forEach((freq, idx) => {
    createPartial(freq, config.gains[idx + 1] || 0.1, config.decays[idx + 1] || 1.0, config.type);
  });

  function createPartial(frequency, gainVal, decayTime, type) {
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();

    osc.type = type;
    // Cho lệch nhẹ tần số một xíu để tiếng dày dặn hơn (Chorusing)
    osc.frequency.setValueAtTime(frequency + (Math.random() - 0.5) * 1.5, now);
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(gainVal, now + 0.02);
    // Tắt dần theo đường cong hàm mũ
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

    osc.connect(oscGain);
    oscGain.connect(filter);
    
    osc.start(now);
    // Tự động dọn dẹp khi âm thanh kết thúc
    osc.stop(now + decayTime + 0.5);
    
    oscs.push(osc);
    gains.push(oscGain);
  }
}

// Phát âm thanh màn trập camera chụp ảnh ảo
export function playCameraShutter() {
  if (state.activeSound === 'mute') return;
  initAudio();
  
  const now = state.audioCtx.currentTime;
  const osc = state.audioCtx.createOscillator();
  const gainNode = state.audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2000, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
  
  gainNode.gain.setValueAtTime(0.3, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc.connect(gainNode);
  gainNode.connect(state.audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.2);
}
