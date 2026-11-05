const { spawnSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
if (process.platform !== "win32") {
  console.error(
    "Build the passive Windows helper on Windows with MSVC (x64 Native Tools command prompt).",
  );
  process.exit(1);
}
mkdirSync("native/bin", { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 90000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const diagnostic = {
    command,
    args,
    status: result.status,
    signal: result.signal,
    error: result.error?.message,
    stdout: result.stdout,
    stderr: result.stderr,
  };
  writeFileSync(
    `native/bin/${command}.json`,
    JSON.stringify(diagnostic, null, 2),
  );
  if (result.status !== 0) {
    console.error("Native build diagnostics: " + JSON.stringify(diagnostic));
    process.exit(1);
  }
}
run("cl.exe", [
  "/nologo",
  "/std:c++17",
  "/EHsc",
  "/O2",
  "/MT",
  "/W4",
  "/DUNICODE",
  "/D_UNICODE",
  "/D_WIN32_WINNT=0x0A00",
  "/c",
  "native/input.cpp",
  "/Fonative/bin/input.obj",
]);
run("link.exe", [
  "/nologo",
  "native/bin/input.obj",
  "/OUT:native/bin/desktop-cat-input.exe",
  "user32.lib",
  "shell32.lib",
  "/SUBSYSTEM:CONSOLE",
  "/DYNAMICBASE",
  "/NXCOMPAT",
]);
