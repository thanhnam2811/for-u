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

	switch (config.engine) {
		case 'zen':
			playWaterSound(config, now);
			return;
		case 'om':
			playOmSound(config, now);
			return;
		default:
			playBellSound(config, now);
	}
}

function createMasterGain(now, peakVolume = state.volume) {
	const masterGain = state.audioCtx.createGain();
	masterGain.gain.setValueAtTime(0, now);
	masterGain.gain.linearRampToValueAtTime(peakVolume, now + 0.01);
	masterGain.connect(state.audioCtx.destination);
	return masterGain;
}

function playBellSound(config, now) {
	const masterGain = createMasterGain(now);

	const filter = state.audioCtx.createBiquadFilter();
	filter.type = config.filterType || 'lowpass';
	filter.frequency.setValueAtTime(config.filterFrequency || 1200, now);
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

	// Tạo tần số gốc
	createPartial(config.baseFreq, config.gains[0], config.decays[0], config.type);

	// Tạo các họa âm
	config.partials.forEach((freq, idx) => {
		createPartial(freq, config.gains[idx + 1] || 0.1, config.decays[idx + 1] || 1.0, config.type);
	});

	// Tự động dừng LFO sau khi âm thanh dứt hẳn, tránh oscillator chạy vô hạn (rò rỉ)
	if (lfo) {
		const maxDecay = Math.max(config.decays[0], ...config.partials.map((_, idx) => config.decays[idx + 1] || 1.0));
		lfo.stop(now + maxDecay + 0.5);
	}

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
	}
}

function playWaterSound(config, now) {
	const duration = config.duration || 1.8;
	const masterGain = createMasterGain(now, state.volume * 0.95);
	masterGain.gain.linearRampToValueAtTime(state.volume * 0.95, now + 0.08);
	masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	const noiseBuffer = state.audioCtx.createBuffer(1, Math.ceil(state.audioCtx.sampleRate * duration), state.audioCtx.sampleRate);
	const channel = noiseBuffer.getChannelData(0);
	for (let i = 0; i < channel.length; i++) {
		const white = (Math.random() * 2) - 1;
		const envelope = 1 - (i / channel.length);
		channel[i] = white * (0.55 + Math.random() * 0.45) * envelope;
	}

	const noiseSource = state.audioCtx.createBufferSource();
	noiseSource.buffer = noiseBuffer;

	const highpass = state.audioCtx.createBiquadFilter();
	highpass.type = 'highpass';
	highpass.frequency.setValueAtTime(config.highpassFrequency || 320, now);

	const lowpass = state.audioCtx.createBiquadFilter();
	lowpass.type = 'lowpass';
	lowpass.frequency.setValueAtTime(config.lowpassFrequency || 3600, now);

	const shimmer = state.audioCtx.createBiquadFilter();
	shimmer.type = 'bandpass';
	shimmer.frequency.setValueAtTime(1400, now);
	shimmer.Q.setValueAtTime(0.9, now);

	const noiseGain = state.audioCtx.createGain();
	noiseGain.gain.setValueAtTime(config.noiseGain || 0.18, now);
	noiseGain.gain.linearRampToValueAtTime((config.noiseGain || 0.18) * 0.7, now + duration * 0.45);
	noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	noiseSource.connect(highpass);
	highpass.connect(lowpass);
	lowpass.connect(shimmer);
	shimmer.connect(noiseGain);
	noiseGain.connect(masterGain);
	noiseSource.start(now);
	noiseSource.stop(now + duration);

	(config.droplets || []).forEach((droplet) => {
		const startTime = now + droplet.time;
		const osc = state.audioCtx.createOscillator();
		const oscGain = state.audioCtx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(droplet.startFreq, startTime);
		osc.frequency.exponentialRampToValueAtTime(droplet.endFreq, startTime + droplet.duration);

		oscGain.gain.setValueAtTime(0.0001, startTime);
		oscGain.gain.linearRampToValueAtTime(droplet.gain * state.volume, startTime + 0.03);
		oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + droplet.duration);

		osc.connect(oscGain);
		oscGain.connect(masterGain);
		osc.start(startTime);
		osc.stop(startTime + droplet.duration + 0.03);
	});
}

function playOmSound(config, now) {
	const duration = config.duration || 2.6;
	const masterGain = createMasterGain(now, state.volume * 0.85);
	masterGain.gain.linearRampToValueAtTime(state.volume * 0.85, now + 0.12);
	masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	const lowpass = state.audioCtx.createBiquadFilter();
	lowpass.type = 'lowpass';
	lowpass.frequency.setValueAtTime(config.filterFrequency || 920, now);
	lowpass.Q.setValueAtTime(0.7, now);
	lowpass.connect(masterGain);

	let tremoloOsc = null;
	let tremoloGain = null;
	if (config.tremolo) {
		tremoloOsc = state.audioCtx.createOscillator();
		tremoloGain = state.audioCtx.createGain();
		tremoloOsc.type = 'sine';
		tremoloOsc.frequency.setValueAtTime(config.tremolo.freq, now);
		tremoloGain.gain.setValueAtTime(config.tremolo.depth, now);
		tremoloOsc.connect(tremoloGain);
		tremoloGain.connect(masterGain.gain);
		tremoloOsc.start(now);
		tremoloOsc.stop(now + duration + 0.1);
	}

	config.harmonics.forEach((harmonic, index) => {
		const osc = state.audioCtx.createOscillator();
		const oscGain = state.audioCtx.createGain();
		const startFreq = (config.fundamental * harmonic) + ((Math.random() - 0.5) * 0.8);

		osc.type = config.waveforms[index] || 'sine';
		osc.frequency.setValueAtTime(startFreq, now);
		osc.detune.setValueAtTime(index * 2.5, now);

		oscGain.gain.setValueAtTime(0.0001, now);
		oscGain.gain.linearRampToValueAtTime((config.gains[index] || 0.08) * state.volume, now + 0.18);
		oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		osc.connect(oscGain);
		oscGain.connect(lowpass);
		osc.start(now);
		osc.stop(now + duration + 0.08);
	});
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
