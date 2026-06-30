import { spriteCache } from '../render/spritecache.js';

class Particle {
  constructor(x, y, colorIndex, dpr) {
    this.x = x;
    this.y = y;
    this.colorIndex = colorIndex;
    this.dpr = dpr;

    // Pick a random shard sprite index from the cache
    this.shardIndex = Math.floor(Math.random() * 4);

    // Initial physics: high initial velocity in random directions
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 6 + 4) * dpr; // speed scaled by DPR
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (Math.random() * 4 + 2) * dpr; // bias upward

    // Rotation & Scaling
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() * 0.2 - 0.1);
    this.scale = Math.random() * 0.5 + 0.5;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.02 + 0.015; // fade speed

    // Forces
    this.gravity = 0.28 * dpr;
    this.drag = 0.985; // Air resistance
  }

  update(dt) {
    // Normal update steps adjusted for dt (dt normal value ~16.6ms at 60fps)
    // To make update tick-based, we normalise dt against 16.67ms
    const step = dt / 16.67;

    this.vx *= Math.pow(this.drag, step);
    this.vy *= Math.pow(this.drag, step);
    this.vy += this.gravity * step;

    this.x += this.vx * step;
    this.y += this.vy * step;
    this.rotation += this.vRot * step;

    this.alpha -= this.decay * step;
    if (this.alpha < 0) {
      this.alpha = 0;
    }
  }

  render(ctx) {
    const shard = spriteCache.particles[this.colorIndex][this.shardIndex];
    if (!shard) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.alpha;

    const size = shard.width * this.scale;
    // Draw centered on position
    ctx.drawImage(shard, -size / 2, -size / 2, size, size);

    ctx.restore();
  }
}

export const particleSystem = {
  particles: [],

  spawnExplosion(x, y, colorIndex) {
    const dpr = spriteCache.dpr;
    // Spawn 15-20 crystal shards per cleared cell
    const count = Math.floor(Math.random() * 6 + 15);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, colorIndex, dpr));
    }
  },

  update(dt) {
    this.particles.forEach(p => p.update(dt));
    // Prune dead particles
    this.particles = this.particles.filter(p => p.alpha > 0);
  },

  render(ctx) {
    this.particles.forEach(p => p.render(ctx));
  },

  clear() {
    this.particles = [];
  }
};
