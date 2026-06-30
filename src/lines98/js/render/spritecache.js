import { THEMES } from '../core/constants.js';

export const spriteCache = {
  balls: [],      // Array of Canvas elements for each color
  ghosts: [],     // 30% opacity preview ghost balls
  glows: [],      // Glowing backdrop halo for potential setups
  particles: [],  // Colored crystal shards
  dpr: 1,
  ballSize: 64,   // Base resolution for high-DPI caching

  initialize(themeName) {
    this.dpr = window.devicePixelRatio || 1;
    // Base texture size (e.g. 64px scaled by DPR, so 128px on 2x Retina screen)
    this.ballSize = Math.round(64 * this.dpr);

    const theme = THEMES[themeName] || THEMES.classic;
    const colors = theme.balls;

    this.balls = [];
    this.ghosts = [];
    this.glows = [];
    this.particles = [];

    // Cache each color
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      const colorIndex = i + 1; // 1-indexed ball colors

      this.balls[colorIndex] = this.createBallSprite(c);
      this.ghosts[colorIndex] = this.createGhostSprite(c);
      this.glows[colorIndex] = this.createGlowSprite(c);
      this.particles[colorIndex] = this.createParticleSprites(c);
    }
  },

  createBallSprite(c) {
    const canvas = document.createElement('canvas');
    canvas.width = this.ballSize;
    canvas.height = this.ballSize;
    const ctx = canvas.getContext('2d');
    const r = this.ballSize / 2;

    ctx.clearRect(0, 0, this.ballSize, this.ballSize);

    // 1. Shadow glow (slight blurred dark bottom shadow)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 4 * this.dpr;
    ctx.shadowOffsetY = 2 * this.dpr;

    // 2. Base Sphere (radial gradient for 3D sphere look)
    ctx.beginPath();
    ctx.arc(r, r, r - 4 * this.dpr, 0, Math.PI * 2);
    
    // Light source from top-left (35% x, 30% y)
    const gradient = ctx.createRadialGradient(
      r * 0.7, r * 0.6, r * 0.1,
      r, r, r - 4 * this.dpr
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

    // 3. Realistic Glass Highlight (white glossy dot on top-left)
    ctx.beginPath();
    ctx.arc(r * 0.68, r * 0.58, r * 0.12, 0, Math.PI * 2);
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

    ctx.clearRect(0, 0, this.ballSize, this.ballSize);

    // Draw sphere at 30% opacity
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.arc(r, r, r - 5 * this.dpr, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      r * 0.7, r * 0.6, r * 0.1,
      r, r, r - 5 * this.dpr
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

    ctx.globalAlpha = 1.0; // Reset
    return canvas;
  },

  createGlowSprite(c) {
    const canvas = document.createElement('canvas');
    canvas.width = this.ballSize * 1.5;
    canvas.height = this.ballSize * 1.5;
    const ctx = canvas.getContext('2d');
    const center = (this.ballSize * 1.5) / 2;
    const r = this.ballSize / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic glow radial aura
    const gradient = ctx.createRadialGradient(
      center, center, r * 0.3,
      center, center, r * 1.4
    );
    gradient.addColorStop(0, c.glow);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  },

  createParticleSprites(c) {
    const shardCanvases = [];
    const shardCount = 4; // Generate a few random shard shapes
    const shardSize = Math.round(16 * this.dpr);

    for (let s = 0; s < shardCount; s++) {
      const canvas = document.createElement('canvas');
      canvas.width = shardSize;
      canvas.height = shardSize;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, shardSize, shardSize);

      ctx.beginPath();
      // Draw random triangle/polygon shards
      ctx.moveTo(Math.random() * shardSize, Math.random() * shardSize);
      ctx.lineTo(Math.random() * shardSize, Math.random() * shardSize);
      ctx.lineTo(Math.random() * shardSize, Math.random() * shardSize);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, shardSize, shardSize);
      grad.addColorStop(0, c.light);
      grad.addColorStop(1, c.dark);

      ctx.fillStyle = grad;
      ctx.fill();

      // Add a tiny glossy white line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.stroke();

      shardCanvases.push(canvas);
    }

    return shardCanvases;
  }
};
