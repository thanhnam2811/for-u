// Bảng tần số họa âm cho các loại chuông dùng trong Web Audio API
export const SOUND_PRESETS = {
  gong: {
    // Chuông khánh chùa trầm ấm ngân vang
    baseFreq: 110,
    partials: [220, 314, 480, 620, 780],
    gains: [1.0, 0.4, 0.3, 0.15, 0.08, 0.03],
    decays: [3.8, 2.5, 2.0, 1.2, 0.8, 0.4],
    type: 'sine'
  },
  chime: {
    // Chuông gió phép thuật lung linh, trong trẻo
    baseFreq: 880,
    partials: [1100, 1320, 1540, 1760, 2200],
    gains: [1.0, 0.6, 0.5, 0.3, 0.2, 0.1],
    decays: [1.5, 1.2, 1.0, 0.8, 0.6, 0.4],
    type: 'triangle'
  },
  bowl: {
    // Chuông xoay Tây Tạng sâu lắng, thiền định
    baseFreq: 220,
    partials: [330, 440, 660],
    gains: [1.0, 0.5, 0.3, 0.1],
    decays: [4.0, 3.0, 2.0, 1.0],
    type: 'sine',
    lfo: { freq: 4.5, depth: 0.15 } // Bộ tạo độ rung chấn
  }
};

// Định nghĩa màu sắc lấp lánh cho từng loại Hào quang
export const THEME_COLORS = {
  gold: {
    primary: '#ffd700',
    secondary: '#ffe066',
    sparkles: ['#ffd700', '#ffffff', '#ffe066', '#cca300', '#fff3cc'],
    ripple: 'rgba(255, 215, 0, 0.4)'
  },
  cosmic: {
    primary: '#d05eff',
    secondary: '#ecb3ff',
    sparkles: ['#d05eff', '#ffffff', '#ecb3ff', '#8c00cc', '#f3d9ff'],
    ripple: 'rgba(208, 94, 255, 0.45)'
  },
  lotus: {
    primary: '#ff7ebb',
    secondary: '#ffb3d9',
    sparkles: ['#ff7ebb', '#ffffff', '#ffb3d9', '#cc3377', '#ffe6f2'],
    ripple: 'rgba(255, 126, 187, 0.4)'
  },
  emerald: {
    primary: '#2effa2',
    secondary: '#a8ffd3',
    sparkles: ['#2effa2', '#ffffff', '#a8ffd3', '#00cc66', '#e6fff2'],
    ripple: 'rgba(46, 255, 162, 0.4)'
  }
};
