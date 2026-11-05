const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = () => import("../src/shared/locomotion.mjs");
test("walk is a four-beat sequence, not two mirrored swinging pairs", async () => {
  const { footCycle, LEG_ORDER } = await load();
  const feet = LEG_ORDER.map((n) => footCycle(0.05, n));
  assert.equal(new Set(feet.map((f) => f.phase.toFixed(2))).size, 4);
  assert.equal(feet.filter((f) => f.stance).length, 3);
});
test("trot uses diagonal pairs with a shorter stance duty", async () => {
  const { footCycle } = await load();
  for (let i = 0; i < 100; i++) {
    const phase = i / 100;
    assert.deepEqual(
      footCycle(phase, "hindLeft", { running: true }),
      footCycle(phase, "frontRight", { running: true }),
    );
    assert.deepEqual(
      footCycle(phase, "hindRight", { running: true }),
      footCycle(phase, "frontLeft", { running: true }),
    );
  }
});
test("planted paws travel backwards at constant speed, with no ground penetration", async () => {
  const { footCycle, LEG_ORDER } = await load();
  for (const leg of LEG_ORDER) {
    let last = null;
    for (let i = 0; i <= 1000; i++) {
      const f = footCycle(i / 1000, leg);
      assert.ok(f.y >= 0 && f.y <= 0.151);
      if (last && last.stance && f.stance && f.phase > last.phase)
        assert.ok(Math.abs(f.z - last.z + 0.64 / 0.7 / 1000) < 1e-9);
      last = f;
    }
  }
});
test("foot trajectories join continuously at lift-off and touchdown", async () => {
  const { footCycle } = await load();
  for (const running of [false, true]) {
    const duty = running ? 0.46 : 0.7;
    for (const edge of [duty, 1]) {
      const a = footCycle(edge - 1e-6, "hindLeft", { running }),
        b = footCycle(edge + 1e-6, "hindLeft", { running });
      assert.ok(Math.hypot(a.z - b.z, a.y - b.y) < 0.0001);
    }
  }
});
test("two-bone IK preserves both segment lengths for reachable targets", async () => {
  const { solveTwoBone } = await load();
  for (const bend of [-1, 1])
    for (let z = -0.3; z <= 0.3; z += 0.02) {
      const hip = { y: 1, z: 0 },
        foot = { y: 0.15, z };
      const knee = solveTwoBone(hip, foot, 0.48, 0.48, bend);
      assert.ok(
        Math.abs(Math.hypot(knee.y - hip.y, knee.z - hip.z) - 0.48) < 1e-9,
      );
      assert.ok(
        Math.abs(Math.hypot(knee.y - foot.y, knee.z - foot.z) - 0.48) < 1e-9,
      );
    }
});
test("vertical travel animates all four paws and rest stops the gait clock", async () => {
  const { FelineMotion } = await load();
  const m = new FelineMotion();
  for (let i = 0; i < 120; i++) m.update(1 / 60, "Walking", { x: 0, y: 85 });
  const phase = m.phase;
  assert.ok(phase > 1);
  for (let i = 0; i < 400; i++) m.update(1 / 60, "Idle");
  const stopped = m.phase;
  for (let i = 0; i < 60; i++) m.update(1 / 60, "Idle");
  assert.ok(Math.abs(stopped - m.phase) < 1e-9);
});
test("pose blending is elapsed-time based and never snaps into sleeping", async () => {
  const { FelineMotion } = await load();
  const a = new FelineMotion(),
    b = new FelineMotion();
  const first = a.update(1 / 60, "Sleeping").weights.sleep;
  assert.ok(first > 0 && first < 0.1);
  for (let i = 1; i < 60; i++) a.update(1 / 60, "Sleeping");
  for (let i = 0; i < 30; i++) b.update(1 / 30, "Sleeping");
  assert.ok(Math.abs(a.weights.sleep - b.weights.sleep) < 1e-9);
});
