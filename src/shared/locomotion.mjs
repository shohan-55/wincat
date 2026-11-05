// Feline footfall timing and sagittal-plane IK, independent of Three.js.
export const LEG_ORDER = ["hindLeft", "frontLeft", "hindRight", "frontRight"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = (t) => t * t * (3 - 2 * t);
export function footCycle(phase, leg, { running = false, stride = 0.64 } = {}) {
  const offsets = running ? [0, 0.5, 0.5, 0] : [0, 0.25, 0.5, 0.75];
  const duty = running ? 0.46 : 0.7;
  const p = (((phase + offsets[LEG_ORDER.indexOf(leg)]) % 1) + 1) % 1;
  if (p < duty)
    return { z: stride * (0.5 - p / duty), y: 0, stance: true, phase: p };
  const swing = (p - duty) / (1 - duty);
  return {
    z: stride * (-0.5 + ease(swing)),
    y: Math.sin(Math.PI * swing) * (running ? 0.22 : 0.15),
    stance: false,
    phase: p,
  };
}
export function solveTwoBone(hip, foot, upper, lower, bend = 1) {
  const dy = foot.y - hip.y,
    dz = foot.z - hip.z,
    length = Math.hypot(dy, dz) || 1e-9;
  const distance = clamp(
    length,
    Math.abs(upper - lower) + 0.001,
    upper + lower - 0.001,
  );
  const uy = dy / length,
    uz = dz / length;
  const along =
    (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return {
    y: hip.y + uy * along - uz * height * bend,
    z: hip.z + uz * along + uy * height * bend,
  };
}
export class FelineMotion {
  constructor() {
    this.phase = 0;
    this.speed = 0;
    this.trot = 0;
    this.weights = {
      sit: 0,
      sleep: 0,
      stretch: 0,
      paw: 0,
      groom: 0,
      yawn: 0,
      surprise: 0,
    };
    this.state = "Idle";
    this.stateTime = 0;
  }
  update(dt, state, velocity = { x: 0, y: 0 }, scale = 1) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
    if (state !== this.state) {
      this.state = state;
      this.stateTime = 0;
    } else this.stateTime += dt;
    const targetSpeed = [
      "Walking",
      "Running",
      "Investigating",
      "Playing",
    ].includes(state)
      ? Math.hypot(velocity.x || 0, velocity.y || 0)
      : 0;
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-9 * dt));
    const running = state === "Running";
    this.trot += ((running ? 1 : 0) - this.trot) * (1 - Math.exp(-8 * dt));
    // Distance-based cycles. At rest the phase stops, rather than pedalling in place.
    this.phase +=
      (this.speed / (Math.max(0.6, scale) * (running ? 95 : 62))) * dt;
    const targets = {
      sit: ["Sitting", "Grooming", "Yawning"].includes(state) ? 1 : 0,
      sleep: state === "Sleeping" ? 1 : 0,
      stretch: state === "Stretching" ? 1 : 0,
      paw: ["Pawing", "Playing"].includes(state) ? 1 : 0,
      groom: state === "Grooming" ? 1 : 0,
      yawn: state === "Yawning" ? 1 : 0,
      surprise: state === "Surprised" ? 1 : 0,
    };
    for (const key of Object.keys(this.weights)) {
      const rate = ["sit", "sleep"].includes(key) ? 4 : 7;
      this.weights[key] +=
        (targets[key] - this.weights[key]) * (1 - Math.exp(-rate * dt));
    }
    const weight = clamp(this.speed / 35, 0, 1);
    const feet = {};
    for (const name of LEG_ORDER) {
      const walk = footCycle(this.phase, name, { stride: 0.64 });
      const trot = footCycle(this.phase, name, { running: true, stride: 0.94 });
      const cycle = this.trot > 0.5 ? trot : walk;
      feet[name] = {
        ...cycle,
        y: (walk.y + (trot.y - walk.y) * this.trot) * weight,
        z: (walk.z + (trot.z - walk.z) * this.trot) * weight,
      };
    }
    return {
      weights: { ...this.weights },
      feet,
      speed: this.speed,
      phase: this.phase,
      running,
      trot: this.trot,
      stateTime: this.stateTime,
      move: weight,
    };
  }
}
