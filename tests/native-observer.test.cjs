const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { EventEmitter } = require("node:events");
function harness(exists = true) {
  const health = [],
    clicks = [],
    status = [],
    timers = [];
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stdout.setEncoding = () => {};
  child.stderr = new EventEmitter();
  child.kill = () => {
    child.killed = true;
  };
  let spawned = 0;
  const scope = {
    module: { exports: {} },
    __dirname: "/app/src/electron",
    process: { pid: 123 },
    setTimeout: (fn, ms) => {
      const timer = { fn, ms };
      timers.push(timer);
      return timer;
    },
    clearTimeout: () => {},
    require: (name) =>
      name === "node:child_process"
        ? {
            spawn: () => {
              spawned++;
              return child;
            },
          }
        : name === "node:fs"
          ? { existsSync: () => exists }
          : require(name),
  };
  vm.runInNewContext(
    fs.readFileSync(
      require.resolve("../src/electron/native-observer.cjs"),
      "utf8",
    ),
    scope,
  );
  const observer = scope.module.exports.observeWindows({
    packaged: false,
    resourcesPath: "/resources",
    screen: { screenToDipPoint: (p) => ({ x: p.x / 2, y: p.y / 2 }) },
    onClick: (p) => clicks.push(p),
    onStatus: (s) => status.push(s),
    onHealth: (h) => health.push(h),
  });
  const send = (s) => child.stdout.emit("data", s);
  return {
    observer,
    send,
    child,
    health,
    clicks,
    status,
    timers,
    get spawned() {
      return spawned;
    },
  };
}
test("native protocol waits for readiness and converts physical coordinates to DIP", () => {
  const h = harness();
  h.send('{"type":"click","x":100,"y":80}\n');
  assert.equal(h.clicks.length, 0);
  h.send('{"type":"rea');
  h.send('dy","version":1}\n{"type":"click","x":-200,"y":300}\n');
  assert.equal(h.health.at(-1).mode, "hook");
  assert.deepEqual(h.clicks, [{ x: -100, y: 150 }]);
  h.observer.close();
  assert.equal(h.child.killed, true);
});
test("malformed or oversized native responses fail closed", () => {
  for (const message of ["invalid json\n", "x".repeat(65537)]) {
    const h = harness();
    h.send(message);
    assert.equal(h.health.at(-1).mode, "unavailable");
    assert.equal(h.child.killed, true);
    assert.equal(h.clicks.length, 0);
    h.observer.close();
  }
});
test("missing native helper is reported rather than faking input", () => {
  const h = harness(false);
  assert.equal(h.spawned, 0);
  assert.equal(h.health.at(-1).mode, "unavailable");
  assert.match(h.health.at(-1).message, /not built/);
  h.observer.close();
});
test("native status only accepts boolean values and finite click positions", () => {
  const h = harness();
  h.send(
    '{"type":"ready","version":1}\n{"type":"status","fullscreen":"yes","game":true,"battery":false}\n{"type":"click","x":"not-a-number","y":4}\n',
  );
  assert.equal(h.status.at(-1).fullscreen, false);
  assert.equal(h.status.at(-1).game, true);
  assert.equal(h.clicks.length, 0);
  h.observer.close();
});
