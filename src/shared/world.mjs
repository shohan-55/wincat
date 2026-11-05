const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const inside = (p, r) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
export class DesktopWorld {
  constructor(displays) {
    this.displays = displays.map((d) => ({ ...d }));
    if (!this.displays.length)
      throw new Error("At least one display is required");
  }
  at(p) {
    return this.displays.findIndex((r) => inside(p, r));
  }
  constrain(p) {
    if (this.at(p) >= 0) return { x: p.x, y: p.y };
    let nearest = null,
      distance = Infinity;
    for (const r of this.displays) {
      const q = {
        x: clamp(p.x, r.x, r.x + r.width),
        y: clamp(p.y, r.y, r.y + r.height),
      };
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < distance) {
        nearest = q;
        distance = d;
      }
    }
    return nearest;
  }
  safe(p) {
    const q = this.constrain(p);
    const r = this.displays[this.at(q)] || this.displays[0];
    const mx = Math.min(110, r.width / 4),
      my = Math.min(150, r.height / 4);
    return {
      x: clamp(p.x, r.x + mx, r.x + r.width - mx),
      y: clamp(p.y, r.y + my, r.y + r.height - my),
    };
  }
  portal(a, b) {
    const y0 = Math.max(a.y, b.y),
      y1 = Math.min(a.y + a.height, b.y + b.height);
    if (
      y1 - y0 >= 40 &&
      (Math.abs(a.x + a.width - b.x) <= 1 || Math.abs(b.x + b.width - a.x) <= 1)
    )
      return {
        x: Math.abs(a.x + a.width - b.x) <= 1 ? b.x : a.x,
        y: (y0 + y1) / 2,
      };
    const x0 = Math.max(a.x, b.x),
      x1 = Math.min(a.x + a.width, b.x + b.width);
    if (
      x1 - x0 >= 40 &&
      (Math.abs(a.y + a.height - b.y) <= 1 ||
        Math.abs(b.y + b.height - a.y) <= 1)
    )
      return {
        x: (x0 + x1) / 2,
        y: Math.abs(a.y + a.height - b.y) <= 1 ? b.y : a.y,
      };
    if (x1 > x0 && y1 > y0) return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    return null;
  }
  route(from, to) {
    const start = this.at(from),
      end = this.at(to);
    if (start < 0 || end < 0) return [];
    if (start === end) return [this.safe(to)];
    const queue = [{ id: start, path: [] }],
      visited = new Set([start]);
    while (queue.length) {
      const { id, path } = queue.shift();
      for (let i = 0; i < this.displays.length; i++) {
        if (visited.has(i)) continue;
        const portal = this.portal(this.displays[id], this.displays[i]);
        if (!portal) continue;
        const next = [...path, portal];
        if (i === end) return [...next, this.safe(to)];
        visited.add(i);
        queue.push({ id: i, path: next });
      }
    }
    return [];
  }
  randomPoint(random = Math.random) {
    const r =
      this.displays[
        Math.min(
          this.displays.length - 1,
          Math.floor(random() * this.displays.length),
        )
      ];
    return this.safe({
      x: r.x + random() * r.width,
      y: r.y + random() * r.height,
    });
  }
}
