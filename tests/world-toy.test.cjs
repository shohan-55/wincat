const { test } = require("node:test");
const assert = require("node:assert/strict");
const modules = () =>
  Promise.all([
    import("../src/shared/world.mjs"),
    import("../src/shared/brain.mjs"),
    import("../src/shared/toy.mjs"),
  ]);
const { defaults } = require("../src/shared/settings.cjs");
test("world routes across adjacent displays at negative origins", async () => {
  const [{ DesktopWorld }] = await modules();
  const w = new DesktopWorld([
    { x: -1000, y: 0, width: 1000, height: 800 },
    { x: 0, y: 0, width: 1200, height: 900 },
  ]);
  const route = w.route({ x: -500, y: 400 }, { x: 500, y: 400 });
  assert.equal(route.length, 2);
  assert.deepEqual(route[0], { x: 0, y: 400 });
  assert.deepEqual(route[1], { x: 500, y: 400 });
});
test("L-shaped monitor routes never cross a virtual-desktop gap", async () => {
  const [{ DesktopWorld }] = await modules();
  const w = new DesktopWorld([
    { x: 0, y: 0, width: 1000, height: 800 },
    { x: 1000, y: 0, width: 1000, height: 800 },
    { x: 1000, y: 800, width: 1000, height: 800 },
  ]);
  const from = { x: 300, y: 300 },
    to = { x: 1400, y: 1200 };
  let p = from;
  for (const q of w.route(from, to)) {
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      assert.ok(
        w.at({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }) >= 0,
      );
    }
    p = q;
  }
});
test("disconnected displays refuse a route instead of teleporting", async () => {
  const [{ DesktopWorld }] = await modules();
  const w = new DesktopWorld([
    { x: 0, y: 0, width: 800, height: 600 },
    { x: 1000, y: 0, width: 800, height: 600 },
  ]);
  assert.deepEqual(w.route({ x: 300, y: 300 }, { x: 1300, y: 300 }), []);
});
test("one brain crosses a monitor seam at bounded speed", async () => {
  const [{ DesktopWorld }, { CatBrain }] = await modules();
  const displays = [
    { x: -1000, y: 0, width: 1000, height: 800 },
    { x: 0, y: 0, width: 1000, height: 800 },
  ];
  const w = new DesktopWorld(displays),
    b = new CatBrain(displays[0], () => 0.5, w);
  b.x = -250;
  b.y = 400;
  b.navigate({ x: 500, y: 400 }, "Investigating", 20);
  for (let i = 0; i < 1000; i++) {
    const x = b.x,
      y = b.y;
    b.update(0.016, {
      ...defaults,
      randomWalking: false,
      pawInteraction: false,
      cursorChasing: false,
    });
    assert.ok(Math.hypot(b.x - x, b.y - y) <= 85 * 0.016 + 0.001);
    assert.ok(w.at(b) >= 0);
  }
  assert.ok(b.x > 400);
});
test("edge destinations remain reachable rather than sticking against clamp", async () => {
  const [{ DesktopWorld }] = await modules();
  const w = new DesktopWorld([{ x: 0, y: 0, width: 1000, height: 800 }]);
  assert.deepEqual(w.route({ x: 300, y: 300 }, { x: 999, y: 2 }), [
    { x: 890, y: 150 },
  ]);
});
test("ball remains confined, bounces, and expires", async () => {
  const [, , { ToyBall }] = await modules();
  const ball = new ToyBall(() => 0.1),
    bounds = { x: -800, y: -200, width: 800, height: 600 };
  ball.spawn({ x: -2, y: -198 }, bounds);
  let bounced = false;
  for (let i = 0; i < 2000; i++) {
    const t = ball.update(0.016, null, true);
    if (t) {
      assert.ok(t.x >= -786 && t.x <= -14);
      assert.ok(t.y >= -186 && t.y <= 386);
      assert.ok(t.height >= 0);
      bounced = bounced || t.height > 24;
    }
  }
  assert.equal(ball.active, false);
  assert.equal(ball.snapshot(), null);
  assert.ok(bounced);
});
test("paw collision gives the ball an impulse and disabling toys removes it", async () => {
  const [, , { ToyBall }] = await modules();
  const ball = new ToyBall(() => 0.5);
  ball.spawn({ x: 300, y: 300 }, { x: 0, y: 0, width: 800, height: 600 });
  ball.update(0.016, { x: 290, y: 300 }, true);
  assert.ok(Math.hypot(ball.vx, ball.vy) > 150);
  assert.equal(ball.update(0.016, null, false), null);
  assert.equal(ball.active, false);
});
test("sudden close pointer motion can trigger a bounded surprise reaction", async () => {
  const [, { CatBrain }] = await modules();
  const b = new CatBrain({ x: 0, y: 0, width: 1000, height: 800 }, () => 0.1);
  b.update(
    0.016,
    { ...defaults, cursorChasing: false },
    { mouse: { x: b.x + 500, y: b.y } },
  );
  const x = b.x;
  b.update(
    0.016,
    { ...defaults, cursorChasing: false },
    { mouse: { x: b.x + 30, y: b.y } },
  );
  assert.equal(b.state, "Surprised");
  assert.ok(Math.abs(b.x - x) <= 80 * 0.016 + 0.01);
});
