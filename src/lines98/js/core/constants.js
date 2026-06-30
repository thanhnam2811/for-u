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
		animation: { pulseSpeed: 1.0, shakePower: 1.0, glowIntensity: 0.6 }
	},
	crystal: {
		name: 'Crystal ✨',
		board: { cellBg: 'rgba(255, 255, 255, 0.15)', gridLine: 'rgba(255, 255, 255, 0.25)' },
		balls: [
			{ main: '#FF7F8E', light: '#FFB8C1', dark: '#CC5F6E', glow: 'rgba(255, 127, 142, 0.45)' },
			{ main: '#7EC8E3', light: '#B4E0F2', dark: '#5A9AB8', glow: 'rgba(126, 200, 227, 0.45)' },
			{ main: '#7ED3B2', light: '#B0E8D4', dark: '#56A88A', glow: 'rgba(126, 211, 178, 0.45)' },
			{ main: '#FFD166', light: '#FFE3A0', dark: '#CCA040', glow: 'rgba(255, 209, 102, 0.45)' },
			{ main: '#B8A9E8', light: '#D4C9F4', dark: '#8E7FC0', glow: 'rgba(184, 169, 232, 0.45)' },
			{ main: '#FFB07C', light: '#FFD0AE', dark: '#CC8A5E', glow: 'rgba(255, 176, 124, 0.45)' },
			{ main: '#E0D4F0', light: '#F0EAF8', dark: '#B0A0C8', glow: 'rgba(224, 212, 240, 0.45)' },
		],
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
			{ main: '#F0F0F0', light: '#FFFFFF', dark: '#C0C0C0', glow: 'rgba(240, 240, 240, 0.6)' },
		],
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
		animation: { pulseSpeed: 1.1, shakePower: 0.9, glowIntensity: 0.9 }
	},
	zen: {
		name: 'Zen Garden 🪷',
		board: { cellBg: 'rgba(245, 235, 220, 0.3)', gridLine: 'rgba(180, 160, 130, 0.35)' },
		balls: [
			{ main: '#C0392B', light: '#E67A6E', dark: '#8E2B1E', glow: 'rgba(192, 57, 43, 0.4)' },
			{ main: '#2E86C1', light: '#7FB3E0', dark: '#1B5C8A', glow: 'rgba(46, 134, 193, 0.4)' },
			{ main: '#27AE60', light: '#72D092', dark: '#1A7A42', glow: 'rgba(39, 174, 96, 0.4)' },
			{ main: '#D4AC0D', light: '#E6CE6E', dark: '#9F7E0A', glow: 'rgba(212, 172, 13, 0.4)' },
			{ main: '#8E44AD', light: '#BC83D1', dark: '#642E7D', glow: 'rgba(142, 68, 173, 0.4)' },
			{ main: '#D35400', light: '#E8944D', dark: '#9F3E00', glow: 'rgba(211, 84, 0, 0.4)' },
			{ main: '#7F8C8D', light: '#B0BABC', dark: '#566264', glow: 'rgba(127, 140, 141, 0.4)' },
		],
		animation: { pulseSpeed: 0.8, shakePower: 0.7, glowIntensity: 0.5 }
	}
};
