const { spawnSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
if (process.platform !== "win32") {
  console.error(
    "The passive Windows input helper must be built on Windows with MSVC (x64 Native Tools command prompt).",
  );
  process.exit(1);
}
mkdirSync("native/bin", { recursive: true });
const build = spawnSync(
  "cl.exe",
  [
    "/nologo",
    "/std:c++17",
    "/EHsc",
    "/O2",
    "/MT",
    "/W4",
    "/DUNICODE",
    "/D_UNICODE",
    "native/input.cpp",
    "/Fo:native/bin/input.obj",
    "/Fe:native/bin/desktop-cat-input.exe",
    "/link",
    "user32.lib",
    "shell32.lib",
    "/SUBSYSTEM:CONSOLE",
    "/DYNAMICBASE",
    "/NXCOMPAT",
  ],
  { stdio: "inherit" },
);
if (build.error)
  console.error(
    "MSVC is required. Open an x64 Native Tools command prompt or use the Windows build workflow.",
    build.error.message,
  );
process.exit(build.status ?? 1);
