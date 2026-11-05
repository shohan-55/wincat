const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  screen,
  nativeImage,
  powerMonitor,
  dialog,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { defaults, sanitize } = require("../shared/settings.cjs");
const { observeWindows } = require("./native-observer.cjs");
const smokeTest = process.argv.includes("--smoke-test");
if (smokeTest) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("enable-unsafe-swiftshader");
  const smokeData = path.join(
    require("node:os").tmpdir(),
    "desktop-cat-smoke-" + process.pid,
  );
  fs.mkdirSync(smokeData, { recursive: true });
  app.setPath("userData", smokeData);
}

let panel, pet, toyWindow, tray, observer, brain, world, ball;
let settings = { ...defaults },
  paused = false,
  hidden = false,
  quitting = false,
  suspended = false,
  systemPaused = false;
let nativeStatus = { fullscreen: false, game: false, battery: false },
  inputHealth = {
    mode: "unavailable",
    message: "Windows observer is starting.",
  };
let telemetry = { fps: 0, behavior: "Starting", effectiveQuality: "balanced" },
  lastSnapshot = null,
  click = null,
  clickId = 0;
let timer,
  saveTimer,
  rebuildTimer,
  lastTick = 0,
  healthError = null,
  renderFailures = 0,
  recoveryTimer;
const settingsPath = () => path.join(app.getPath("userData"), "settings.json");
const state = () => ({
  settings,
  paused,
  hidden,
  systemPaused,
  telemetry,
  nativeClicks: inputHealth.mode === "hook",
  inputHealth,
  healthError,
  onBattery: nativeStatus.battery,
  desktop: true,
});
function windows() {
  return [panel, pet, toyWindow].filter((w) => w && !w.isDestroyed());
}
function broadcast() {
  for (const w of windows()) w.webContents.send("state", state());
}
function writeSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    const tmp = settingsPath() + ".tmp";
    fs.writeFileSync(
      tmp,
      JSON.stringify(settings.rememberSettings ? settings : defaults, null, 2),
    );
    fs.renameSync(tmp, settingsPath());
  } catch (e) {
    healthError = "Could not save preferences: " + e.message;
    broadcast();
  }
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeSettings, 250);
}
function configureWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.webContents.on("will-attach-webview", (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_, __, cb) => cb(false));
}
function load(win, query = {}) {
  configureWindow(win);
  win
    .loadFile(path.join(__dirname, "../../dist/index.html"), { query })
    .catch((e) => {
      healthError = "Could not load application: " + e.message;
      broadcast();
    });
}
const webPreferences = () => ({
  preload: path.join(__dirname, "preload.cjs"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
});
function openPanel() {
  if (panel && !panel.isDestroyed()) {
    panel.show();
    panel.focus();
    return;
  }
  panel = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 720,
    title: "Desktop Cat",
    backgroundColor: "#f7f8fa",
    icon: path.join(__dirname, "../../assets/icon.png"),
    webPreferences: webPreferences(),
  });
  panel.setMenuBarVisibility(false);
  load(panel);
  panel.on("close", (e) => {
    if (!quitting && settings.minimizeToTray && tray) {
      e.preventDefault();
      panel.hide();
    }
  });
  panel.webContents.on("render-process-gone", () => {
    if (!quitting) panel.reload();
  });
}
function overlay(bounds, kind) {
  const win = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: { ...webPreferences(), backgroundThrottling: false },
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(settings.alwaysOnTop, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  load(win, { overlay: kind });
  win.once("ready-to-show", () => {
    if (!hidden && !systemPaused && (kind === "pet" || ball?.active))
      win.showInactive();
  });
  return win;
}
function position(win, x, y, width, height) {
  if (!win || win.isDestroyed()) return;
  const b = win.getBounds(),
    next = { x: Math.round(x), y: Math.round(y), width, height };
  if (
    b.x !== next.x ||
    b.y !== next.y ||
    b.width !== width ||
    b.height !== height
  )
    win.setBounds(next, false);
}
function recoverPet(reason) {
  if (quitting || recoveryTimer) return;
  healthError = "3D renderer interrupted: " + reason;
  broadcast();
  if (++renderFailures > 3) {
    hidden = true;
    pet?.hide();
    openPanel();
    healthError =
      "3D rendering failed repeatedly. Update the graphics driver, choose Economy, then press Restart cat.";
    broadcast();
    return;
  }
  recoveryTimer = setTimeout(() => {
    recoveryTimer = null;
    if (!quitting) rebuildOverlays(false);
  }, 1000 * renderFailures);
}
function rebuildOverlays(reset = false) {
  if (!brain) return;
  const displays = screen.getAllDisplays().map((d) => d.bounds);
  world = new DesktopWorld(displays);
  brain.world = world;
  if (reset) {
    const d = screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint(),
    ).workArea;
    brain = new CatBrain(d, Math.random, world);
  } else if (world.at(brain) < 0) {
    Object.assign(brain, world.safe(world.constrain(brain)));
    brain.stop("Sitting", 2);
  }
  brain.target = null;
  brain.route = [];
  ball.active = false;
  for (const w of [pet, toyWindow]) if (w && !w.isDestroyed()) w.destroy();
  pet = overlay(
    {
      x: Math.round(brain.x - 180),
      y: Math.round(brain.y - 180),
      width: 360,
      height: 360,
    },
    "pet",
  );
  toyWindow = overlay(
    { x: Math.round(brain.x), y: Math.round(brain.y), width: 80, height: 100 },
    "toy",
  );
  pet.webContents.on(
    "render-process-gone",
    (_, details) =>
      details.reason !== "clean-exit" && recoverPet(details.reason),
  );
  toyWindow.webContents.on("render-process-gone", () => {
    if (!quitting) {
      ball.active = false;
      toyWindow.hide();
    }
  });
}
function updateTray() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Control Panel", click: openPanel },
      { type: "separator" },
      {
        label: hidden ? "Show Cat" : "Hide Cat",
        click: () => command(hidden ? "show" : "hide"),
      },
      {
        label: paused ? "Resume Cat" : "Pause Cat",
        click: () => command(paused ? "resume" : "pause"),
      },
      {
        label: "Play with a Ball",
        enabled: settings.toys,
        click: () => command("toy"),
      },
      { label: "Settings", click: openPanel },
      { type: "separator" },
      { label: "Exit Desktop Cat", click: () => command("exit") },
    ]),
  );
}
function visibility() {
  const visible = !hidden && !systemPaused;
  if (pet && !pet.isDestroyed()) {
    if (visible) pet.showInactive();
    else pet.hide();
  }
  if (toyWindow && !toyWindow.isDestroyed()) {
    if (visible && ball?.active) toyWindow.showInactive();
    else toyWindow.hide();
  }
  if (!visible) telemetry = { ...telemetry, fps: 0 };
}
function applySettings(previous) {
  if (previous.startWithWindows !== settings.startWithWindows) {
    try {
      const portable = !!process.env.PORTABLE_EXECUTABLE_FILE;
      if ((!app.isPackaged || portable) && settings.startWithWindows) {
        settings.startWithWindows = false;
        healthError =
          "Automatic startup is supported by the installed app, not development or portable builds.";
      } else
        app.setLoginItemSettings({
          name: "Desktop Cat",
          openAtLogin: settings.startWithWindows,
          path: app.getPath("exe"),
        });
    } catch (e) {
      settings.startWithWindows = previous.startWithWindows;
      healthError = "Windows startup could not be changed: " + e.message;
    }
  }
  for (const w of [pet, toyWindow])
    if (w && !w.isDestroyed())
      w.setAlwaysOnTop(settings.alwaysOnTop, "floating");
  if (!settings.toys && ball) ball.active = false;
  updateSystemPause();
  visibility();
  updateTray();
  save();
  broadcast();
}
function command(cmd) {
  switch (cmd) {
    case "start":
    case "restart":
      paused = false;
      hidden = false;
      healthError = null;
      renderFailures = 0;
      clearTimeout(recoveryTimer);
      recoveryTimer = null;
      rebuildOverlays(true);
      break;
    case "pause":
      paused = true;
      break;
    case "resume":
      paused = false;
      break;
    case "hide":
      hidden = true;
      break;
    case "show":
      hidden = false;
      break;
    case "toy":
      if (settings.toys && brain) {
        const bounds = screen.getDisplayNearestPoint({
          x: Math.round(brain.x),
          y: Math.round(brain.y),
        }).workArea;
        const point = world.safe({ x: brain.x + 130, y: brain.y + 35 });
        ball.spawn(point, bounds);
        brain.navigate(point, "Playing", 6);
      }
      break;
    case "exit":
      quitting = true;
      app.quit();
      return true;
    case "defaults": {
      const previous = settings;
      settings = { ...defaults };
      applySettings(previous);
      break;
    }
    default:
      return false;
  }
  visibility();
  updateTray();
  broadcast();
  return true;
}
function updateSystemPause() {
  const next =
    suspended ||
    (settings.pauseFullscreen && nativeStatus.fullscreen) ||
    (settings.pauseGames && nativeStatus.game);
  if (next !== systemPaused) {
    systemPaused = next;
    visibility();
    broadcast();
  }
}
function tick() {
  const now = performance.now(),
    elapsed = Math.min(0.15, (now - lastTick) / 1000);
  lastTick = now;
  if (!brain || quitting) return;
  const mouse = screen.getCursorScreenPoint();
  if (!paused && !hidden && !systemPaused) {
    let left = elapsed;
    while (left > 0) {
      const dt = Math.min(0.033, left);
      const toy = ball.update(
        dt,
        settings.pawInteraction ? brain : null,
        settings.toys,
      );
      lastSnapshot = brain.update(dt, settings, { mouse, click, toy });
      left -= dt;
    }
  } else lastSnapshot = { ...brain.snapshot(), vx: 0, vy: 0 };
  click = null;
  if (!lastSnapshot) lastSnapshot = brain.snapshot();
  if (hidden || systemPaused) return;
  position(pet, lastSnapshot.x - 180, lastSnapshot.y - 180, 360, 360);
  if (pet && !pet.isDestroyed())
    pet.webContents.send("input", {
      snapshot: lastSnapshot,
      onBattery: nativeStatus.battery,
    });
  if (ball.active) {
    const t = ball.snapshot();
    position(toyWindow, t.x - 40, t.y - 55, 80, 100);
    if (toyWindow && !toyWindow.isDestroyed()) {
      if (!toyWindow.isVisible()) toyWindow.showInactive();
      toyWindow.webContents.send("input", { toy: t, paused });
    }
  } else if (toyWindow && !toyWindow.isDestroyed() && toyWindow.isVisible()) {
    toyWindow.webContents.send("input", { toy: null });
    toyWindow.hide();
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (app.isReady()) openPanel();
  });
  app
    .whenReady()
    .then(async () => {
      try {
        settings = sanitize(
          JSON.parse(fs.readFileSync(settingsPath(), "utf8")),
        );
      } catch {}
      ({ CatBrain, DesktopWorld, ToyBall } = await (async () => {
        const [b, w, t] = await Promise.all(
          ["brain", "world", "toy"].map(
            (n) =>
              import(
                pathToFileURL(path.join(__dirname, `../shared/${n}.mjs`)).href
              ),
          ),
        );
        return { ...b, ...w, ...t };
      })());
      world = new DesktopWorld(screen.getAllDisplays().map((d) => d.bounds));
      brain = new CatBrain(
        screen.getPrimaryDisplay().workArea,
        Math.random,
        world,
      );
      ball = new ToyBall();
      const image = nativeImage.createFromPath(
        path.join(__dirname, "../../assets/icon.png"),
      );
      try {
        tray = new Tray(image.resize({ width: 20, height: 20 }));
        tray.setToolTip("Desktop Cat — Your little companion");
        tray.on("double-click", openPanel);
        updateTray();
      } catch (e) {
        healthError = "System tray unavailable. Keep the control panel open.";
        settings.minimizeToTray = false;
      }
      openPanel();
      rebuildOverlays();
      if (process.platform === "win32")
        observer = observeWindows({
          packaged: app.isPackaged,
          resourcesPath: process.resourcesPath,
          screen,
          onClick: (point) => {
            if (!paused && !hidden && !systemPaused && settings.clickToPlay) {
              click = { ...point, id: ++clickId };
            }
          },
          onStatus: (s) => {
            nativeStatus = s;
            updateSystemPause();
          },
          onHealth: (s) => {
            inputHealth = s;
            if (s.mode !== "hook") {
              nativeStatus = {
                ...nativeStatus,
                fullscreen: false,
                game: false,
              };
              updateSystemPause();
            }
            broadcast();
          },
        });
      else
        inputHealth = {
          mode: "unavailable",
          message: "Global click observation is supported on Windows only.",
        };
      lastTick = performance.now();
      timer = setInterval(tick, 33);
      const scheduleRebuild = () => {
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => rebuildOverlays(false), 250);
      };
      screen.on("display-added", scheduleRebuild);
      screen.on("display-removed", scheduleRebuild);
      screen.on("display-metrics-changed", scheduleRebuild);
      if (smokeTest)
        require("./smoke.cjs").smoke({
          app,
          getPet: () => pet,
          getState: state,
          command,
          settingsPath,
          writeSettings,
        });
      powerMonitor.on("suspend", () => {
        suspended = true;
        updateSystemPause();
      });
      powerMonitor.on("resume", () => {
        suspended = false;
        lastTick = performance.now();
        updateSystemPause();
      });
    })
    .catch((error) => {
      if (smokeTest) {
        if (process.env.DESKTOP_CAT_SMOKE_REPORT)
          fs.writeFileSync(
            process.env.DESKTOP_CAT_SMOKE_REPORT,
            JSON.stringify({ passed: false, error: error.message }),
          );
        app.exit(1);
        return;
      }
      dialog.showErrorBox("Desktop Cat could not start", error.message);
      quitting = true;
      app.quit();
    });
}
// Declared once; assigned after dynamic ESM imports at startup.
let CatBrain, DesktopWorld, ToyBall;
ipcMain.handle("state", () => state());
ipcMain.handle("settings", (event, value) => {
  if (!panel || event.sender !== panel.webContents) return state();
  const previous = settings;
  settings = sanitize({ ...settings, ...value });
  applySettings(previous);
  return state();
});
ipcMain.handle("command", (event, cmd) => {
  if (panel && event.sender === panel.webContents) command(cmd);
  return state();
});
ipcMain.on("telemetry", (event, v) => {
  if (pet && event.sender === pet.webContents && v) {
    if (v.error) {
      recoverPet(String(v.error).slice(0, 120));
      return;
    }
    if (Number.isFinite(v.fps)) {
      telemetry = {
        fps:
          hidden || systemPaused
            ? 0
            : Math.max(0, Math.min(240, Math.round(v.fps))),
        behavior: brain?.state || "Idle",
        effectiveQuality: ["economy", "balanced", "high"].includes(v.quality)
          ? v.quality
          : settings.quality,
      };
      broadcast();
    }
  }
});
app.on("window-all-closed", () => {
  if (!tray && !quitting) {
    quitting = true;
    app.quit();
  }
});
app.on("before-quit", () => {
  quitting = true;
  clearInterval(timer);
  clearTimeout(saveTimer);
  clearTimeout(rebuildTimer);
  clearTimeout(recoveryTimer);
  observer?.close();
  writeSettings();
});
