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
    const dpr = this.dpr;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = size / 2;
    const pad = Math.round(4 * this.dpr * scaleFactor);
    const radius = r - pad;

    ctx.clearRect(0, 0, size, size);

    // ── 1. Soft drop shadow ──
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.round(8 * dpr * scaleFactor);
    ctx.shadowOffsetY = Math.round(4 * dpr * scaleFactor);
    ctx.beginPath();
    ctx.arc(r, r, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    ctx.fill();
    ctx.restore();

    // ── 2. Main sphere body — richer multi-stop gradient ──
    ctx.beginPath();
    ctx.arc(r, r, radius, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();

    const gradient = ctx.createRadialGradient(
      r * 0.62, r * 0.48, Math.max(1, r * 0.03),
      r, r, radius
    );
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.08, c.light);
    gradient.addColorStop(0.35, c.main);
    gradient.addColorStop(0.7, c.dark);
    gradient.addColorStop(0.92, c.dark);
    gradient.addColorStop(1, '#000000');

    ctx.fillStyle = gradient;
    ctx.fill();

    // ── 3. Subsurface scattering glow (backlit edge) ──
    const sss = ctx.createRadialGradient(
      r * 1.3, r * 1.4, 0,
      r * 1.3, r * 1.4, radius * 0.9
    );
    sss.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    sss.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
    sss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.beginPath();
    ctx.arc(r * 1.3, r * 1.4, radius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = sss;
    ctx.fill();

    // ── 4. Primary specular highlight (elliptical) ──
    ctx.beginPath();
    ctx.ellipse(
      r * 0.68, r * 0.48,
      radius * 0.28, radius * 0.2,
      -0.3, 0, Math.PI * 2
    );
    const spec1 = ctx.createRadialGradient(
      r * 0.66, r * 0.46, 0,
      r * 0.66, r * 0.46, radius * 0.28
    );
    spec1.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    spec1.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
    spec1.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = spec1;
    ctx.fill();

    // ── 5. Secondary specular (sharp hotspot) ──
    ctx.beginPath();
    ctx.ellipse(
      r * 0.6, r * 0.4,
      radius * 0.1, radius * 0.07,
      -0.3, 0, Math.PI * 2
    );
    const spec2 = ctx.createRadialGradient(
      r * 0.6, r * 0.4, 0,
      r * 0.6, r * 0.4, radius * 0.1
    );
    spec2.addColorStop(0, 'rgba(255, 255, 255, 1)');
    spec2.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    spec2.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = spec2;
    ctx.fill();

    // ── 6. Environment reflection strip ──
    ctx.beginPath();
    ctx.ellipse(
      r * 1.05, r * 0.75,
      radius * 0.5, radius * 0.08,
      0.4, 0, Math.PI * 2
    );
    const env = ctx.createLinearGradient(
      r * 1.05 - radius * 0.5, r * 0.75,
      r * 1.05 + radius * 0.5, r * 0.75
    );
    env.addColorStop(0, 'rgba(255, 255, 255, 0)');
    env.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
    env.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    env.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
    env.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = env;
    ctx.fill();

    // ── 7. Fresnel edge glow ──
    const fresnel = ctx.createRadialGradient(
      r, r, radius * 0.65,
      r, r, radius
    );
    fresnel.addColorStop(0, 'rgba(255, 255, 255, 0)');
    fresnel.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
    fresnel.addColorStop(0.94, 'rgba(255, 255, 255, 0.12)');
    fresnel.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.beginPath();
    ctx.arc(r, r, radius, 0, Math.PI * 2);
    ctx.fillStyle = fresnel;
    ctx.fill();

    // ── 8. Inner shadow (top-left occlusion) ──
    const innerShadow = ctx.createRadialGradient(
      r * 0.4, r * 0.35, radius * 0.4,
      r * 0.4, r * 0.35, radius * 1.2
    );
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    innerShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.02)');
    innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.beginPath();
    ctx.arc(r * 0.4, r * 0.35, radius * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = innerShadow;
    ctx.fill();

    ctx.restore(); // end clip

    // ── 9. Anti-aliased edge ──
    ctx.beginPath();
    ctx.arc(r, r, radius - 0.5 / dpr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1 / dpr;
    ctx.stroke();

    // ── 10. Subtle rim highlight on top-right ──
    const rimTop = ctx.createRadialGradient(
      r * 1.05, r * 0.3, 0,
      r * 1.05, r * 0.3, radius * 0.3
    );
    rimTop.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    rimTop.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.beginPath();
    ctx.arc(r * 1.05, r * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = rimTop;
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
