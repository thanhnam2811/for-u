export class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }

  // Mulberry32 fast deterministic pseudo-random number generator
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  saveState() {
    return this.seed;
  }

  loadState(state) {
    this.seed = state;
  }

  clone() {
    return new SeededRNG(this.seed);
  }
}
