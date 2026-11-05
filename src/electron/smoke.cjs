const fs = require("node:fs");
const { once } = require("node:events");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function smoke({
  app,
  getPet,
  getState,
  command,
  settingsPath,
  writeSettings,
}) {
  const checks = [];
  const check = (name, condition) => {
    checks.push({ name, passed: !!condition });
    if (!condition) throw new Error(name);
  };
  const report = {
    platform: process.platform,
    electron: process.versions.electron,
    checks,
    passed: false,
  };
  let timeout;
  try {
    await Promise.race([
      (async () => {
        const pet = getPet();
        if (pet.webContents.isLoading())
          await once(pet.webContents, "did-finish-load");
        await delay(1000);
        check(
          "transparent borderless nonfocusable pet",
          pet.isFocusable() === false && pet.isAlwaysOnTop() === true,
        );
        check(
          "WebGL renderer loaded",
          await pet.webContents.executeJavaScript(
            '!!document.querySelector("canvas")?.getContext("webgl2")',
          ),
        );
        command("pause");
        check("pause command", getState().paused);
        command("resume");
        check("resume command", !getState().paused);
        command("hide");
        check("hide command", getState().hidden && !pet.isVisible());
        command("show");
        check("show command", !getState().hidden);
        command("toy");
        check("toy command accepted", getState().settings.toys);
        writeSettings();
        check(
          "preferences persisted",
          JSON.parse(fs.readFileSync(settingsPath(), "utf8")).appearance ===
            getState().settings.appearance,
        );
        for (let i = 0; i < 20 && getState().inputHealth.mode !== "hook"; i++)
          await delay(250);
        check(
          "native passive hook connected",
          getState().inputHealth.mode === "hook",
        );
        report.passed = true;
      })(),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Smoke test exceeded 25 seconds")),
          25000,
        );
      }),
    ]);
  } catch (error) {
    report.error = error.message;
  } finally {
    clearTimeout(timeout);
    const output = process.env.DESKTOP_CAT_SMOKE_REPORT;
    if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2));
    app.exit(report.passed ? 0 : 1);
  }
}
module.exports = { smoke };
