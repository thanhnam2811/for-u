export class Tween {
  constructor(target, properties, duration, options = {}) {
    this.target = target;
    this.properties = properties; // e.g. { scale: 1.2, alpha: 0.5 }
    this.duration = duration;
    this.elapsed = 0;
    this.options = options; // { easing, onComplete }
    this.startValues = {};
    this.completed = false;

    // Capture initial values
    for (const key in properties) {
      this.startValues[key] = target[key] !== undefined ? target[key] : 0;
    }
  }

  update(dt) {
    if (this.completed) return;
    this.elapsed += dt;
    let t = Math.min(this.elapsed / this.duration, 1);

    // Apply Easing
    let progress = t;
    const easing = this.options.easing || 'linear';
    if (easing === 'easeOutQuad') {
      progress = t * (2 - t);
    } else if (easing === 'easeInOutQuad') {
      progress = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    } else if (easing === 'easeInQuad') {
      progress = t * t;
    } else if (easing === 'easeOutBounce') {
      progress = this.easeOutBounce(t);
    }

    for (const key in this.properties) {
      const start = this.startValues[key];
      const end = this.properties[key];
      this.target[key] = start + (end - start) * progress;
    }

    if (t >= 1) {
      this.completed = true;
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    }
  }

  easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
}

export class TweenManager {
  constructor() {
    this.tweens = [];
  }

  add(target, properties, duration, options = {}) {
    // Stop any existing tween on the same target/properties if desired
    const tween = new Tween(target, properties, duration, options);
    this.tweens.push(tween);
    return tween;
  }

  update(dt) {
    this.tweens = this.tweens.filter(t => {
      t.update(dt);
      return !t.completed;
    });
  }

  clear() {
    this.tweens = [];
  }

  killTweensOf(target) {
    this.tweens = this.tweens.filter(t => t.target !== target);
  }
}

export const tweenManager = new TweenManager();
