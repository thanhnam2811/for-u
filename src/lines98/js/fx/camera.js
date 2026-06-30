export class ScreenTransform {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.scale = 1.0;
    this.angle = 0;

    // Shake variables
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    // Zoom variables
    this.zoomTarget = 1.0;
    this.zoomSpeed = 0.05;

    // 2.5D perspective tilt
    this.skewX = 0;
    this.skewY = 0;
    this.skewTargetX = 0;
    this.skewTargetY = 0;

    // Floating idle oscillation
    this.time = 0;
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  setZoom(target) {
    this.zoomTarget = target;
  }

  /**
   * Set a 2.5D perspective skew target (subtle tilt).
   * @param {number} sx - Horizontal skew factor (-0.05 to 0.05)
   * @param {number} sy - Vertical skew factor (-0.05 to 0.05)
   */
  setSkewTarget(sx, sy) {
    this.skewTargetX = sx;
    this.skewTargetY = sy;
  }

  update(dt) {
    const step = dt / 16.67;
    this.time += 0.015 * step;

    // 1. Idle rotation/tilt oscillation (slow wave between -0.3 and 0.3 degrees)
    this.angle = Math.sin(this.time) * 0.005;

    // 2. 2.5D perspective skew — subtle idle oscillation
    this.skewX += (this.skewTargetX + Math.sin(this.time * 0.7) * 0.008 - this.skewX) * 0.03 * step;
    this.skewY += (this.skewTargetY + Math.cos(this.time * 0.5) * 0.005 - this.skewY) * 0.03 * step;

    // 3. Zoom interpolation (towards 1.0 or 1.05)
    this.scale += (this.zoomTarget - this.scale) * this.zoomSpeed * step;

    // 4. Screen shake calculation
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += dt;
      const progress = this.shakeElapsed / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * (1 - progress);

      this.offsetX = (Math.random() * 2 - 1) * currentIntensity;
      this.offsetY = (Math.random() * 2 - 1) * currentIntensity;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  /**
   * Applies the transformation matrix to the canvas.
   * Includes 2.5D perspective tilt via skew transform.
   */
  apply(ctx, width, height) {
    ctx.save();

    // 1. Shake offsets
    ctx.translate(this.offsetX, this.offsetY);

    // 2. Rotate & Scale around the center of the board
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(this.angle);
    ctx.scale(this.scale, this.scale);

    // 3. 2.5D perspective tilt via skew
    const skewX = this.skewX * 0.05;
    const skewY = this.skewY * 0.03;
    ctx.transform(1, skewY, skewX, 1, 0, 0);

    ctx.translate(-centerX, -centerY);
  }

  /**
   * Restores the canvas state.
   */
  restore(ctx) {
    ctx.restore();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 1.0;
    this.angle = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
    this.zoomTarget = 1.0;
    this.skewX = 0;
    this.skewY = 0;
    this.skewTargetX = 0;
    this.skewTargetY = 0;
  }
}

export const screenTransform = new ScreenTransform();
