import { THEMES } from '../core/constants.js';

// 5 ball scale states for pulse animation (pre-rendered at DPR)
export const BALL_STATE_SCALES = [0.70, 0.82, 0.94, 1.06, 1.18];

// 3 glow intensity levels
export const GLOW_INTENSITIES = [0.3, 0.65, 1.0];

export const spriteCache = {
  balls: [],      // balls[color][state] -> Canvas
  ghosts: [],     // ghosts[color] -> Canvas
  glows: [],      // glows[color][intensity] -> Canvas
  particles: [],  // particles[color] -> [Canvas x4]
  dpr: 1,
  ballSize: 64,

  initialize(themeName) {
    this.dpr = window.devicePixelRatio || 1;
    this.ballSize = Math.round(64 * this.dpr);

    const theme = THEMES[themeName] || THEMES.classic;
    const colors = theme.balls;

    this.balls = [];
    this.ghosts = [];
    this.glows = [];
    this.particles = [];

    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      const colorIndex = i + 1;

      // 5 ball states at different scales for pulse animation
      const stateSprites = [];
      for (let s = 0; s < BALL_STATE_SCALES.length; s++) {
        stateSprites.push(this.createBallSprite(c, BALL_STATE_SCALES[s]));
      }
      this.balls[colorIndex] = stateSprites;

      this.ghosts[colorIndex] = this.createGhostSprite(c);

      // 3 glow intensities
      const glowSprites = [];
      for (let g = 0; g < GLOW_INTENSITIES.length; g++) {
        glowSprites.push(this.createGlowSprite(c, GLOW_INTENSITIES[g]));
      }
      this.glows[colorIndex] = glowSprites;

      this.particles[colorIndex] = this.createParticleSprites(c);
    }
  },

  /**
   * Map a desired scale factor to nearest pre-rendered state index (0-4).
   */
  scaleToState(scale) {
    const t = (scale - BALL_STATE_SCALES[0]) / (BALL_STATE_SCALES[4] - BALL_STATE_SCALES[0]);
    return Math.max(0, Math.min(4, Math.round(t * 4)));
  },

  createBallSprite(c, scaleFactor) {
    const size = Math.round(this.ballSize * scaleFactor);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = size / 2;
    const pad = Math.round(4 * this.dpr * scaleFactor);

    ctx.clearRect(0, 0, size, size);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = Math.round(4 * this.dpr * scaleFactor);
    ctx.shadowOffsetY = Math.round(2 * this.dpr * scaleFactor);

    // 3D sphere with radial gradient
    ctx.beginPath();
    ctx.arc(r, r, r - pad, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(
      r * 0.7, r * 0.6, Math.max(1, r * 0.1),
      r, r, r - pad
    );
    gradient.addColorStop(0, c.light);
    gradient.addColorStop(0.55, c.main);
    gradient.addColorStop(1, c.dark);

    ctx.fillStyle = gradient;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Glass highlight
    ctx.beginPath();
    ctx.arc(r * 0.68, r * 0.58, Math.max(1, r * 0.12), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.fill();

    return canvas;
  },

  createGhostSprite(c) {
    const canvas = document.createElement('canvas');
    canvas.width = this.ballSize;
    canvas.height = this.ballSize;
    const ctx = canvas.getContext('2d');
    const r = this.ballSize / 2;
    const pad = Math.round(5 * this.dpr);

    ctx.clearRect(0, 0, this.ballSize, this.ballSize);
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.arc(r, r, r - pad, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      r * 0.7, r * 0.6, r * 0.1,
      r, r, r - pad
    );
    gradient.addColorStop(0, c.light);
    gradient.addColorStop(0.6, c.main);
    gradient.addColorStop(1, c.dark);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r * 0.68, r * 0.58, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();

    ctx.globalAlpha = 1.0;
    return canvas;
  },

  createGlowSprite(c, alpha) {
    const canvas = document.createElement('canvas');
    const totalSize = Math.round(this.ballSize * 1.5);
    canvas.width = totalSize;
    canvas.height = totalSize;
    const ctx = canvas.getContext('2d');
    const center = totalSize / 2;
    const r = this.ballSize / 2;

    ctx.clearRect(0, 0, totalSize, totalSize);

    const gradient = ctx.createRadialGradient(
      center, center, r * 0.3,
      center, center, r * 1.4
    );
    gradient.addColorStop(0, c.glow.replace('0.45', String(alpha * 0.45)));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  },

  createParticleSprites(c) {
    const shardCanvases = [];
    const shardCount = 4;
    const shardSize = Math.round(16 * this.dpr);

    for (let s = 0; s < shardCount; s++) {
      const canvas = document.createElement('canvas');
      canvas.width = shardSize;
      canvas.height = shardSize;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, shardSize, shardSize);

      ctx.beginPath();
      ctx.moveTo(Math.random() * shardSize, Math.random() * shardSize);
      ctx.lineTo(Math.random() * shardSize, Math.random() * shardSize);
      ctx.lineTo(Math.random() * shardSize, Math.random() * shardSize);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, shardSize, shardSize);
      grad.addColorStop(0, c.light);
      grad.addColorStop(1, c.dark);

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.stroke();

      shardCanvases.push(canvas);
    }

    return shardCanvases;
  }
};
