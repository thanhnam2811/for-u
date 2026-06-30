// ── Lines 98 Remastered — Constants & Themes Registry ──

export const SIZE = 9;
export const NUM_COLORS = 7;
export const MIN_LINE = 5;
export const SPAWN_COUNT = 3;
export const INITIAL_SPAWN = 5;
export const MOVE_STEP_MS = 55;

// localStorage keys
export const LS_HIGH = 'lines98_highScore';
export const LS_THEME = 'lines98_theme';
export const LS_SOUND = 'lines98_sound';
export const LS_SAVE = 'lines98_save';
export const LS_CHECKPOINT = 'lines98_checkpoint_';

export const THEMES = {
	classic: {
		name: 'Classic CRT 🕹️',
		board: { cellBg: 'rgba(255, 255, 255, 0.28)', gridLine: 'rgba(255, 255, 255, 0.4)' },
		balls: [
			{ main: '#EF4444', light: '#FCA5A5', dark: '#B91C1C', glow: 'rgba(239, 68, 68, 0.45)' },
			{ main: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8', glow: 'rgba(59, 130, 246, 0.45)' },
			{ main: '#22C55E', light: '#86EFAC', dark: '#15803D', glow: 'rgba(34, 197, 94, 0.45)' },
			{ main: '#EAB308', light: '#FDE047', dark: '#A16207', glow: 'rgba(234, 179, 8, 0.45)' },
			{ main: '#D946EF', light: '#F0ABFC', dark: '#A21CAF', glow: 'rgba(217, 70, 239, 0.45)' },
			{ main: '#06B6D4', light: '#67E8F9', dark: '#0E7490', glow: 'rgba(6, 182, 212, 0.45)' },
			{ main: '#A3715B', light: '#D4A68E', dark: '#78503F', glow: 'rgba(163, 113, 91, 0.45)' },
		],
		particles: { shardCount: [15, 20], gravity: 0.28, speed: [4, 6] },
		audio: { selectPitch: 880, clearChord: 'major', heartbeatFreq: 65, volume: 1.0 },
		ambient: { style: 'retro', color: '#FFEBF0' },
		hud: { pressureColor: 'rgba(239,68,68,0.65)', textColor: '#EF4444', accentColor: '#3B82F6' },
		animation: { pulseSpeed: 1.0, shakePower: 1.0, glowIntensity: 0.6 }
	},
	win98: {
		name: 'Windows 98 🖥️',
		board: { cellBg: 'rgba(192, 192, 192, 0.35)', gridLine: 'rgba(128, 128, 128, 0.5)' },
		balls: [
			{ main: '#FF0000', light: '#FF6666', dark: '#CC0000', glow: 'rgba(255, 0, 0, 0.4)' },
			{ main: '#0000FF', light: '#6666FF', dark: '#0000CC', glow: 'rgba(0, 0, 255, 0.4)' },
			{ main: '#008000', light: '#00CC00', dark: '#006600', glow: 'rgba(0, 128, 0, 0.4)' },
			{ main: '#FFFF00', light: '#FFFF66', dark: '#CCCC00', glow: 'rgba(255, 255, 0, 0.4)' },
			{ main: '#FF00FF', light: '#FF66FF', dark: '#CC00CC', glow: 'rgba(255, 0, 255, 0.4)' },
			{ main: '#00FFFF', light: '#66FFFF', dark: '#00CCCC', glow: 'rgba(0, 255, 255, 0.4)' },
			{ main: '#808080', light: '#C0C0C0', dark: '#606060', glow: 'rgba(128, 128, 128, 0.4)' },
		],
		particles: { shardCount: [8, 12], gravity: 0.35, speed: [3, 5] },
		audio: { selectPitch: 660, clearChord: 'pentatonic', heartbeatFreq: 55, volume: 0.8 },
		ambient: { style: 'chiptune', color: '#C0C0C0' },
		hud: { pressureColor: 'rgba(255,0,0,0.5)', textColor: '#0000FF', accentColor: '#008000' },
		animation: { pulseSpeed: 0.7, shakePower: 0.6, glowIntensity: 0.4 }
	},
	crystal: {
		name: 'Crystal ✨',
		board: { cellBg: 'rgba(255, 255, 255, 0.15)', gridLine: 'rgba(255, 255, 255, 0.25)' },
		balls: [
			{ main: '#FF6B8A', light: '#FFB0C0', dark: '#CC4468', glow: 'rgba(255, 107, 138, 0.45)' },
			{ main: '#5BA3E6', light: '#94C8F0', dark: '#3A7AB8', glow: 'rgba(91, 163, 230, 0.45)' },
			{ main: '#5BC8A0', light: '#90E0C4', dark: '#3A9E7A', glow: 'rgba(91, 200, 160, 0.45)' },
			{ main: '#FFD166', light: '#FFE8A0', dark: '#CCA040', glow: 'rgba(255, 209, 102, 0.45)' },
			{ main: '#B87CD8', light: '#D0A8E8', dark: '#8E52B0', glow: 'rgba(184, 124, 216, 0.45)' },
			{ main: '#FF9050', light: '#FFB888', dark: '#CC6E2E', glow: 'rgba(255, 144, 80, 0.45)' },
			{ main: '#E0D4F0', light: '#F0EAF8', dark: '#B0A0C8', glow: 'rgba(224, 212, 240, 0.45)' },
		],
		particles: { shardCount: [20, 28], gravity: 0.22, speed: [5, 8] },
		audio: { selectPitch: 1100, clearChord: 'major', heartbeatFreq: 72, volume: 1.1 },
		ambient: { style: 'ethereal', color: '#E8F0FE' },
		hud: { pressureColor: 'rgba(255,127,142,0.6)', textColor: '#FF7F8E', accentColor: '#7EC8E3' },
		animation: { pulseSpeed: 1.2, shakePower: 0.8, glowIntensity: 0.8 }
	},
	neon: {
		name: 'Neon Cyber 💡',
		board: { cellBg: 'rgba(15, 12, 27, 0.4)', gridLine: 'rgba(47, 42, 74, 0.6)' },
		balls: [
			{ main: '#FF2D6A', light: '#FF7FA3', dark: '#C41E50', glow: 'rgba(255, 45, 106, 0.6)' },
			{ main: '#00D4FF', light: '#66E5FF', dark: '#009EBF', glow: 'rgba(0, 212, 255, 0.6)' },
			{ main: '#00FF87', light: '#66FFB3', dark: '#00BF65', glow: 'rgba(0, 255, 135, 0.6)' },
			{ main: '#FFE600', light: '#FFF066', dark: '#BFAC00', glow: 'rgba(255, 230, 0, 0.6)' },
			{ main: '#BF00FF', light: '#D966FF', dark: '#8F00BF', glow: 'rgba(191, 0, 255, 0.6)' },
			{ main: '#FF8C00', light: '#FFB366', dark: '#BF6900', glow: 'rgba(255, 140, 0, 0.6)' },
			{ main: '#E0E8F0', light: '#F0F4F8', dark: '#B0BCC8', glow: 'rgba(224, 232, 240, 0.6)' },
		],
		particles: { shardCount: [18, 25], gravity: 0.30, speed: [6, 9] },
		audio: { selectPitch: 1000, clearChord: 'synth', heartbeatFreq: 70, volume: 1.2 },
		ambient: { style: 'synthwave', color: '#0F0C1B' },
		hud: { pressureColor: 'rgba(255,45,106,0.7)', textColor: '#00D4FF', accentColor: '#FF2D6A' },
		animation: { pulseSpeed: 1.4, shakePower: 1.2, glowIntensity: 1.0 }
	},
	galaxy: {
		name: 'Galaxy Space 🌌',
		board: { cellBg: 'rgba(10, 6, 30, 0.45)', gridLine: 'rgba(90, 60, 180, 0.35)' },
		balls: [
			{ main: '#FF6B9D', light: '#FFB3CC', dark: '#C44070', glow: 'rgba(255, 107, 157, 0.5)' },
			{ main: '#7B68EE', light: '#B0A5F5', dark: '#4E3DC7', glow: 'rgba(123, 104, 238, 0.5)' },
			{ main: '#00FA9A', light: '#66FFC0', dark: '#00B86B', glow: 'rgba(0, 250, 154, 0.5)' },
			{ main: '#FFD700', light: '#FFE866', dark: '#C8A800', glow: 'rgba(255, 215, 0, 0.5)' },
			{ main: '#DA70D6', light: '#EBA8E9', dark: '#B04DAC', glow: 'rgba(218, 112, 214, 0.5)' },
			{ main: '#48D1CC', light: '#8CE8E4', dark: '#2EAAA5', glow: 'rgba(72, 209, 204, 0.5)' },
			{ main: '#F0E6FF', light: '#FFFFFF', dark: '#C4B3E6', glow: 'rgba(240, 230, 255, 0.5)' },
		],
		particles: { shardCount: [16, 22], gravity: 0.25, speed: [4, 7] },
		audio: { selectPitch: 940, clearChord: 'major', heartbeatFreq: 60, volume: 1.0 },
		ambient: { style: 'cosmic', color: '#0A061E' },
		hud: { pressureColor: 'rgba(123,104,238,0.65)', textColor: '#FF6B9D', accentColor: '#7B68EE' },
		animation: { pulseSpeed: 1.1, shakePower: 0.9, glowIntensity: 0.9 }
	},
	zen: {
		name: 'Zen Garden 🌿',
		board: { cellBg: 'rgba(245, 235, 220, 0.3)', gridLine: 'rgba(180, 160, 130, 0.35)' },
		balls: [
			{ main: '#C0392B', light: '#E67A6E', dark: '#8E2B1E', glow: 'rgba(192, 57, 43, 0.4)' },
			{ main: '#2980B9', light: '#7FB3D0', dark: '#1A5C8A', glow: 'rgba(41, 128, 185, 0.4)' },
			{ main: '#27AE60', light: '#72D092', dark: '#1A7A42', glow: 'rgba(39, 174, 96, 0.4)' },
			{ main: '#D4AC0D', light: '#E6CE6E', dark: '#9F7E0A', glow: 'rgba(212, 172, 13, 0.4)' },
			{ main: '#8E44AD', light: '#BC83D1', dark: '#642E7D', glow: 'rgba(142, 68, 173, 0.4)' },
			{ main: '#E67E22', light: '#ECA85E', dark: '#B85E0E', glow: 'rgba(230, 126, 34, 0.4)' },
			{ main: '#7F8C8D', light: '#B0BABC', dark: '#566264', glow: 'rgba(127, 140, 141, 0.4)' },
		],
		particles: { shardCount: [12, 16], gravity: 0.20, speed: [3, 5] },
		audio: { selectPitch: 780, clearChord: 'pentatonic', heartbeatFreq: 50, volume: 0.7 },
		ambient: { style: 'nature', color: '#F5EBDC' },
		hud: { pressureColor: 'rgba(192,57,43,0.5)', textColor: '#2E86C1', accentColor: '#27AE60' },
		animation: { pulseSpeed: 0.8, shakePower: 0.7, glowIntensity: 0.5 }
	}
};
