/* Renderer-independent state machine. All coordinates are DIP; injected RNG enables reproducible tests. */
class CatBrain {
  constructor(bounds, random = Math.random, world = null) {
    this.bounds = bounds;
    this.world = world;
    this.random = random;
    this.x = bounds.x + bounds.width * 0.65;
    this.y = bounds.y + bounds.height * 0.7;
    this.target = null;
    this.route = [];
    this.state = "Idle";
    this.previous = "";
    this.timer = 2;
    this.phase = 0;
    this.stateTime = 0;
    this.look = { x: 0, y: 0 };
    this.lastMouse = null;
    this.clickId = 0;
    this.reactionCooldown = 0;
    this.energy = 1;
    this.clamp();
  }
  resize(bounds) {
    this.bounds = bounds;
    this.target = null;
    this.route = [];
    this.clamp();
  }
  clamp() {
    if (this.world) {
      Object.assign(this, this.world.constrain(this));
      return;
    }
    const b = this.bounds,
      mx = Math.min(110, b.width / 4),
      my = Math.min(150, b.height / 4);
    this.x = Math.max(b.x + mx, Math.min(b.x + b.width - mx, this.x));
    this.y = Math.max(b.y + my, Math.min(b.y + b.height - my, this.y));
  }
  transition(state, duration) {
    if (state !== this.state) {
      this.previous = this.state;
      this.state = state;
      this.stateTime = 0;
    }
    this.timer = duration;
  }
  navigate(point, state, duration = 6) {
    if (
      this.target &&
      this.goal &&
      this.state === state &&
      Math.hypot(point.x - this.goal.x, point.y - this.goal.y) < 20
    ) {
      this.timer = duration;
      return true;
    }
    const route = this.world ? this.world.route(this, point) : [{ ...point }];
    if (!route.length) return false;
    this.goal = { x: point.x, y: point.y };
    this.route = route;
    this.target = this.route.shift();
    this.transition(state, duration);
    return true;
  }
  stop(state, duration) {
    this.goal = null;
    this.target = null;
    this.route = [];
    this.transition(state, duration);
  }
  update(dt, s, input = {}) {
    dt = Math.min(0.05, Math.max(0, dt));
    this.phase += dt;
    this.stateTime += dt;
    this.timer -= dt;
    this.reactionCooldown = Math.max(0, this.reactionCooldown - dt);
    const mouse = input.mouse,
      d = mouse ? Math.hypot(mouse.x - this.x, mouse.y - this.y) : Infinity;
    const sudden =
      mouse && this.lastMouse
        ? Math.hypot(mouse.x - this.lastMouse.x, mouse.y - this.lastMouse.y) /
          Math.max(0.001, dt)
        : 0;
    if (mouse) this.lastMouse = { ...mouse };
    this.look =
      s.mouseTracking && mouse
        ? {
            x: Math.max(-1, Math.min(1, (mouse.x - this.x) / 150)),
            y: Math.max(-1, Math.min(1, (mouse.y - this.y) / 150)),
          }
        : { x: 0, y: 0 };
    if (!s.toys && this.state === "Playing") this.stop("Sitting", 2);
    if (
      !s.randomWalking &&
      ["Walking", "Running"].includes(this.state) &&
      !input.mouse
    )
      this.stop("Idle", 2);
    if (input.click && input.click.id !== this.clickId) {
      this.clickId = input.click.id;
      if (s.clickToPlay) this.navigate(input.click, "Investigating", 8);
    }
    const locked =
      ["Pawing", "Pouncing", "Surprised", "Yawning", "Stretching"].includes(
        this.state,
      ) && this.timer > 0;
    if (!locked && s.toys && input.toy) {
      this.navigate(input.toy, "Playing", 4);
    } else if (
      !locked &&
      mouse &&
      s.cursorChasing &&
      d < s.detectionDistance &&
      d > 100 &&
      this.state !== "Investigating"
    )
      this.navigate(mouse, d > 220 ? "Running" : "Walking", 2);
    if (
      mouse &&
      d < 105 &&
      s.pawInteraction &&
      this.reactionCooldown <= 0 &&
      this.state !== "Investigating"
    ) {
      if (sudden > 1300 && this.random() < 0.45) {
        this.stop("Surprised", 0.8);
        this.reactionCooldown = 3;
      } else if (
        !locked &&
        this.timer < 0.7 &&
        this.random() < s.animationFrequency / 100
      ) {
        this.stop(this.random() < 0.65 ? "Pawing" : "Pouncing", 1.5);
        this.reactionCooldown = 2;
      }
    }
    if (this.timer <= 0) {
      this.target = null;
      this.route = [];
      const r = this.random();
      if (s.randomWalking && r < s.activity / 140) {
        const p = this.world
          ? this.world.randomPoint(this.random)
          : {
              x:
                this.bounds.x +
                110 +
                this.random() * Math.max(0, this.bounds.width - 220),
              y:
                this.bounds.y +
                150 +
                this.random() * Math.max(0, this.bounds.height - 300),
            };
        if (!this.navigate(p, "Walking", 10)) this.stop("Sitting", 3);
      } else {
        const idle = [
          "Sitting",
          "Grooming",
          "Stretching",
          "Sleeping",
          "Yawning",
          "Idle",
        ].filter((v) => v !== this.state);
        const next =
          idle[
            Math.min(idle.length - 1, Math.floor(this.random() * idle.length))
          ];
        this.stop(
          next,
          next === "Sleeping"
            ? 12
            : next === "Yawning"
              ? 2.5
              : 3 + this.random() * 5,
        );
      }
    }
    let vx = 0,
      vy = 0;
    if (this.target) {
      const dx = this.target.x - this.x,
        dy = this.target.y - this.y,
        dist = Math.hypot(dx, dy);
      const stop = this.route.length
        ? 0
        : this.state === "Investigating"
          ? 12
          : this.state === "Playing"
            ? 65
            : 85;
      if (dist > stop + 0.5) {
        const max =
          (this.state === "Running"
            ? 190
            : this.state === "Playing"
              ? 125
              : 85) * s.speed;
        const speed = Math.min(max, Math.max(0, (dist - stop) * 3));
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
        this.x += vx * dt;
        this.y += vy * dt;
      } else if (this.route.length) this.target = this.route.shift();
      else this.stop(s.pawInteraction ? "Pawing" : "Sitting", 2);
    }
    // A brief backward recoil, with bounded velocity and the same desktop constraints.
    if (this.state === "Surprised" && mouse && this.stateTime < 0.25) {
      const dx = this.x - mouse.x,
        dy = this.y - mouse.y,
        len = Math.hypot(dx, dy) || 1;
      vx = (dx / len) * 80;
      vy = (dy / len) * 80;
      this.x += vx * dt;
      this.y += vy * dt;
    }
    this.clamp();
    return {
      x: this.x,
      y: this.y,
      state: this.state,
      previous: this.previous,
      stateTime: this.stateTime,
      vx,
      vy,
      look: this.look,
      phase: this.phase,
    };
  }
  snapshot() {
    return {
      x: this.x,
      y: this.y,
      state: this.state,
      previous: this.previous,
      stateTime: this.stateTime,
      vx: 0,
      vy: 0,
      look: this.look,
      phase: this.phase,
    };
  }
}
export { CatBrain };
