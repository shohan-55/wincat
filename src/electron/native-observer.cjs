const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
// One bounded, supervised helper; protocol lines contain only input metadata, never keys/window titles.
function observeWindows({
  packaged,
  resourcesPath,
  screen,
  onClick,
  onStatus,
  onHealth,
}) {
  const executable = packaged
    ? path.join(resourcesPath, "native", "desktop-cat-input.exe")
    : path.join(__dirname, "../../native/bin/desktop-cat-input.exe");
  let child = null,
    restart = null,
    closed = false,
    failures = 0,
    ready = false,
    heartbeat = null;
  const fail = (message) => {
    ready = false;
    onHealth({ mode: "unavailable", message });
  };
  function start() {
    if (closed) return;
    if (!fs.existsSync(executable)) {
      fail(
        "Native observer is not built. Click observation is unavailable; run npm run build:native on Windows.",
      );
      return;
    }
    child = spawn(executable, [String(process.pid)], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let buffer = "";
    heartbeat = setTimeout(() => {
      fail("Native observer startup timed out.");
      child?.kill();
    }, 5000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > 65536) {
        fail("Invalid native observer output.");
        child.kill();
        return;
      }
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        try {
          const event = JSON.parse(line);
          if (event.type === "ready" && event.version === 1) {
            clearTimeout(heartbeat);
            ready = true;
            onHealth({
              mode: "hook",
              message: "Passive Windows mouse hook connected.",
            });
          } else if (
            ready &&
            event.type === "click" &&
            Number.isFinite(event.x) &&
            Number.isFinite(event.y)
          ) {
            onClick(screen.screenToDipPoint({ x: event.x, y: event.y }));
          } else if (ready && event.type === "status") {
            onStatus({
              fullscreen: event.fullscreen === true,
              game: event.game === true,
              battery: event.battery === true,
            });
          } else if (event.type === "error") {
            fail(`Windows observer error ${Number(event.code) || 0}.`);
          }
        } catch {
          fail("Malformed native observer response.");
          child.kill();
        }
      }
    });
    child.stderr.on("data", () => {});
    child.on("error", (error) => fail(error.message));
    child.on("exit", () => {
      clearTimeout(heartbeat);
      child = null;
      if (closed) return;
      fail("Native input observer stopped. Retrying.");
      if (++failures <= 3) restart = setTimeout(start, 1000 * failures);
      else
        fail(
          "Native observer could not recover. Restart the application to retry.",
        );
    });
  }
  start();
  return {
    close() {
      closed = true;
      clearTimeout(restart);
      clearTimeout(heartbeat);
      child?.kill();
    },
  };
}
module.exports = { observeWindows };
