/**
 * aura/scripts/utils/math.js
 * Core Math Utilities for High-End Canvas Effects
 */

// --- SIMPLEX NOISE (Simplified implementation for 2D/3D) ---
// Based on the open-source Simplex Noise algorithm for smooth procedural randomness
const grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = i;
for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
}
const perm = new Uint8Array(512);
for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

function fastfloor(x) { return Math.floor(x); }
function dot(g, x, y) { return g[0] * x + g[1] * y; }

export function simplex2d(x, y) {
    let n0, n1, n2;
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (x + y) * F2;
    const i = fastfloor(x + s);
    const j = fastfloor(y + s);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else { t0 *= t0; n0 = t0 * t0 * dot(grad3[perm[ii + perm[jj]] % 12], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else { t1 *= t1; n1 = t1 * t1 * dot(grad3[perm[ii + i1 + perm[jj + j1]] % 12], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else { t2 *= t2; n2 = t2 * t2 * dot(grad3[perm[ii + 1 + perm[jj + 1]] % 12], x2, y2); }
    return 70.0 * (n0 + n1 + n2);
}

// --- SPRING PHYSICS (Mass-Spring-Damper Model) ---
export class Spring {
    constructor(mass = 1, stiffness = 100, damping = 10) {
        this.mass = mass;
        this.stiffness = stiffness;
        this.damping = damping;
        this.position = 0;
        this.velocity = 0;
        this.target = 0;
    }

    update(dt = 0.016) {
        const force = -this.stiffness * (this.position - this.target) - this.damping * this.velocity;
        const acceleration = force / this.mass;
        this.velocity += acceleration * dt;
        this.position += this.velocity * dt;
        return this.position;
    }

    setTarget(target) {
        this.target = target;
    }

    applyImpulse(v) {
        this.velocity += v;
    }
}

// --- EASING FUNCTIONS ---
export const Ease = {
    inQuad: t => t * t,
    outQuad: t => t * (2 - t),
    inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    outElastic: t => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
};
