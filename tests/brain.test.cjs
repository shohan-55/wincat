const { test } = require("node:test");
const assert = require("node:assert/strict");
const { defaults, sanitize } = require("../src/shared/settings.cjs");
const brain = () => import("../src/shared/brain.mjs");
test("settings reject unknown keys, invalid enums and nonfinite numbers", () => {
  const s = sanitize({
    speed: Infinity,
    size: 50,
    appearance: "invalid",
    randomWalking: "yes",
    fpsLimit: 0,
    admin: true,
  });
  assert.equal(s.speed, 1);
  assert.equal(s.size, 1.6);
  assert.equal(s.appearance, "cream");
  assert.equal(s.randomWalking, true);
  assert.equal(s.fpsLimit, 15);
  assert.equal(s.admin, undefined);
});
test("cat stays within a monitor at a negative screen origin", async () => {
  const { CatBrain } = await brain();
  const b = new CatBrain(
    { x: -1920, y: -200, width: 1920, height: 1080 },
    () => 0.2,
  );
  for (let i = 0; i < 10000; i++) {
    const v = b.update(0.016, defaults, { mouse: { x: -1910, y: -190 } });
    assert.ok(v.x >= -1830 && v.x <= -90);
    assert.ok(v.y >= -110 && v.y <= 790);
  }
});
test("movement is bounded and never teleports", async () => {
  const { CatBrain } = await brain();
  const b = new CatBrain({ x: 0, y: 0, width: 1920, height: 1080 }, () => 0.1);
  for (let i = 0; i < 1000; i++) {
    const x = b.x,
      y = b.y;
    b.update(0.016, defaults, { mouse: { x: 1400, y: 700 } });
    assert.ok(Math.hypot(b.x - x, b.y - y) <= 190 * 0.016 + 0.001);
  }
});
test("disabled interactions leave the cat idle", async () => {
  const { CatBrain } = await brain();
  const b = new CatBrain({ x: 0, y: 0, width: 800, height: 600 }, () => 0.99);
  const s = {
    ...defaults,
    randomWalking: false,
    cursorChasing: false,
    mouseTracking: false,
    pawInteraction: false,
    clickToPlay: false,
  };
  const x = b.x,
    y = b.y;
  for (let i = 0; i < 1000; i++)
    b.update(0.02, s, {
      mouse: { x: 100, y: 100 },
      click: { x: 200, y: 200, id: 1 },
    });
  assert.equal(b.x, x);
  assert.equal(b.y, y);
  assert.deepEqual(b.look, { x: 0, y: 0 });
  assert.equal(b.target, null);
});
test("click creates an investigation without changing the input", async () => {
  const { CatBrain } = await brain();
  const b = new CatBrain({ x: 0, y: 0, width: 1920, height: 1080 }, () => 0.5);
  const input = Object.freeze({
    click: Object.freeze({ x: 500, y: 500, id: 1 }),
  });
  b.update(0.016, defaults, input);
  assert.equal(b.state, "Investigating");
  assert.equal(b.target.x, 500);
});
test("resize clamps position to new display bounds", async () => {
  const { CatBrain } = await brain();
  const b = new CatBrain({ x: 0, y: 0, width: 3840, height: 2160 });
  b.resize({ x: 0, y: 0, width: 800, height: 600 });
  assert.ok(b.x <= 710 && b.y <= 510);
});
test("cursor approach stops short of pointer", async () => {
  const { CatBrain } = await brain();
  const b = new CatBrain({ x: 0, y: 0, width: 1000, height: 800 }, () => 0.5);
  const mouse = { x: b.x + 150, y: b.y };
  for (let i = 0; i < 500; i++)
    b.update(0.016, { ...defaults, randomWalking: false }, { mouse });
  assert.ok(Math.hypot(b.x - mouse.x, b.y - mouse.y) >= 80);
});
