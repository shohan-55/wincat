// Tiny deterministic 2D toy physics; no input injection, no unbounded allocations.
export class ToyBall {
  constructor(random = Math.random) {
    this.random = random;
    this.active = false;
    this.time = 0;
    this.radius = 14;
    this.cooldown = 0;
  }
  spawn(point, bounds) {
    this.bounds = bounds;
    this.x = point.x;
    this.y = point.y;
    const a = this.random() * Math.PI * 2;
    this.vx = Math.cos(a) * 95;
    this.vy = Math.sin(a) * 95;
    this.height = 24;
    this.bounce = 110;
    this.time = 30;
    this.active = true;
    this.cooldown = 0;
    this.confine();
  }
  confine() {
    const r = this.radius,
      b = this.bounds;
    for (const [axis, size] of [
      ["x", "width"],
      ["y", "height"],
    ]) {
      const min = b[axis] + r,
        max = b[axis] + b[size] - r;
      if (this[axis] < min) {
        this[axis] = min;
        this["v" + axis] = Math.abs(this["v" + axis]) * 0.82;
      }
      if (this[axis] > max) {
        this[axis] = max;
        this["v" + axis] = -Math.abs(this["v" + axis]) * 0.82;
      }
    }
  }
  update(dt, cat, enabled = true) {
    dt = Math.min(0.05, Math.max(0, dt));
    if (!enabled) {
      this.active = false;
      return null;
    }
    if (!this.active) return null;
    this.time -= dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.time <= 0) {
      this.active = false;
      return null;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.exp(-0.6 * dt);
    this.vy *= Math.exp(-0.6 * dt);
    this.bounce -= 400 * dt;
    this.height += this.bounce * dt;
    if (this.height < 0) {
      this.height = 0;
      this.bounce = Math.abs(this.bounce) * 0.58;
      if (this.bounce < 8) this.bounce = 0;
    }
    this.confine();
    if (
      cat &&
      this.cooldown <= 0 &&
      Math.hypot(cat.x - this.x, cat.y - this.y) < 90
    ) {
      const a =
        Math.atan2(this.y - cat.y, this.x - cat.x) +
        (this.random() - 0.5) * 0.6;
      this.vx = Math.cos(a) * 180;
      this.vy = Math.sin(a) * 180;
      this.bounce = 100;
      this.cooldown = 1.3;
    }
    return this.snapshot();
  }
  snapshot() {
    return this.active
      ? {
          x: this.x,
          y: this.y,
          height: this.height,
          radius: this.radius,
          time: this.time,
        }
      : null;
  }
}
