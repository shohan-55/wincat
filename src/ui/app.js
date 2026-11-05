import { createCatScene } from "./cat.js";
import { icon } from "./icons.js";
import defaults from "../shared/defaults.json";
const native = window.desktopCat;
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("desktop-cat") || "{}");
} catch {}
let state = native
  ? await native.getState()
  : {
      settings: { ...defaults, ...saved },
      paused: false,
      hidden: false,
      desktop: false,
      telemetry: { fps: 0, behavior: "Idle" },
    };
let page = "Dashboard",
  scene,
  frame = 0,
  last = 0,
  renderAt = 0,
  fpsStart = 0,
  frames = 0,
  currentBehavior = "Idle",
  toyUntil = 0;
const app = document.querySelector("#app");
const params = new URLSearchParams(location.search);
const overlay = params.has("overlay");
if (overlay) {
  document.body.classList.add("overlay");
  app.innerHTML = '<canvas id="cat"></canvas>';
  const canvas = document.querySelector("canvas");
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  let snapshot = { state: "Idle", phase: 0, look: { x: 0, y: 0 }, vx: 0 },
    receivedAt = performance.now();
  let toy = null,
    onBattery = false,
    reduced = 0,
    slowSamples = 0,
    qualityRequested = state.settings.quality,
    fastSamples = 0;
  const isToy = params.get("overlay") === "toy";
  let context;
  if (isToy) context = canvas.getContext("2d");
  else {
    try {
      scene = createCatScene(canvas, { overlay: true });
    } catch (error) {
      native.telemetry({ error: error.message });
    }
    canvas.addEventListener("webglcontextlost", () =>
      native.telemetry({ error: "Graphics context lost" }),
    );
  }
  native.onState((s) => {
    state = s;
  });
  native.onInput((v) => {
    if (v.snapshot) {
      snapshot = v.snapshot;
      receivedAt = performance.now();
    }
    if (Object.hasOwn(v, "toy")) toy = v.toy;
    onBattery = v.onBattery === true;
  });
  function loop(now) {
    frame = requestAnimationFrame(loop);
    const limit =
      (isToy && !toy) || state.hidden || state.systemPaused
        ? 2
        : state.paused
          ? 5
          : snapshot.state === "Sleeping"
            ? 15
            : state.settings.fpsLimit;
    if (now - renderAt < 1000 / limit) return;
    renderAt = now;
    if (state.hidden || state.systemPaused) return;
    if (isToy) {
      if (!context || !toy) return;
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = 80 * ratio;
      canvas.height = 100 * ratio;
      context.scale(ratio, ratio);
      context.clearRect(0, 0, 80, 100);
      context.fillStyle = "rgba(40,45,40,.12)";
      context.beginPath();
      context.ellipse(40, 66, 15, 4, 0, 0, Math.PI * 2);
      context.fill();
      const y = 57 - toy.height * 0.4;
      const gradient = context.createRadialGradient(35, y - 6, 1, 40, y, 16);
      gradient.addColorStop(0, "#c2c6f0");
      gradient.addColorStop(1, "#777da9");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(40, y, 14, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#d7dbf2";
      context.lineWidth = 1.5;
      context.beginPath();
      context.ellipse(40, y, 7, 14, 0.4, 0, Math.PI * 2);
      context.stroke();
      return;
    }
    if (!scene) return;
    if (qualityRequested !== state.settings.quality) {
      qualityRequested = state.settings.quality;
      fastSamples = 0;
      reduced = 0;
      slowSamples = 0;
    }
    const qualities = ["high", "balanced", "economy"];
    const quality = state.settings.autoQuality
      ? onBattery
        ? "economy"
        : qualities[Math.min(2, qualities.indexOf(qualityRequested) + reduced)]
      : qualityRequested;
    const time =
      snapshot.phase +
      (state.paused ? 0 : Math.min(0.1, (now - receivedAt) / 1000));
    scene.render(
      time,
      snapshot.state,
      { ...state.settings, quality, size: state.settings.size * 0.78 },
      snapshot.look,
      snapshot.vx,
    );
    frames++;
    if (now - fpsStart > 2000) {
      const fps = (frames * 1000) / (now - fpsStart);
      if (
        !state.paused &&
        snapshot.state !== "Sleeping" &&
        fps < Math.min(35, state.settings.fpsLimit * 0.65)
      ) {
        if (++slowSamples >= 3) {
          reduced = Math.min(2, reduced + 1);
          slowSamples = 0;
        }
      } else {
        slowSamples = 0;
        if (++fastSamples >= 15) {
          reduced = Math.max(0, reduced - 1);
          fastSamples = 0;
        }
      }
      native.telemetry({ fps, behavior: snapshot.state, quality });
      frames = 0;
      fpsStart = now;
    }
  }
  requestAnimationFrame(loop);
} else {
  const nav = [
    ["Dashboard", "grid"],
    ["Behavior", "sliders"],
    ["Appearance", "spark"],
    ["Toys & play", "ball"],
    ["General", "settings"],
  ];
  const toggle = (key, title, desc) =>
    `<div class="setting-row"><div><strong>${title}</strong><p>${desc}</p></div><button class="switch ${state.settings[key] ? "on" : ""}" role="switch" aria-checked="${state.settings[key]}" aria-label="${title}" data-toggle="${key}"><span></span></button></div>`;
  const slider = (key, title, min, max, step, suffix = "") =>
    `<div class="range-row"><label for="${key}">${title}</label><output id="${key}-value">${state.settings[key]}${suffix}</output><input id="${key}" data-range="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state.settings[key]}"></div>`;
  function shell() {
    app.innerHTML = `<aside><a class="brand" href="#">${icon("paw", 30)}<span>desktop<span class="brand-light">cat</span><small>YOUR LITTLE COMPANION</small></span></a><div class="workspace-label">YOUR COMPANION</div><nav>${nav.map(([n, i]) => `<button data-page="${n}" class="nav-item ${page === n ? "active" : ""}">${icon(i)}${n}${page === n ? "<i></i>" : ""}</button>`).join("")}</nav><div class="sidebar-bottom"><div class="quiet-card"><span class="tiny-paw">${icon("heart", 20)}</span><strong>A little company.<br>A lot of happiness.</strong><p>Made for your everyday.</p></div><button class="nav-item" data-page="Help & about">${icon("help")}Help & about</button><div class="version"><span class="status-dot"></span> Desktop Cat <span>v0.2.0</span></div></div></aside><main><header><div class="breadcrumb">Your workspace <span>/</span> <b>${page}</b></div><div class="header-right"><span class="platform">${icon("monitor", 15)} ${native ? "Windows companion" : "Browser preview"}</span><span class="avatar">S</span></div></header><div class="page"><div class="page-heading"><div><div class="eyebrow">A LITTLE MORE JOY ON YOUR DESKTOP</div><h1>${page === "Dashboard" ? "Home, sweet desktop." : page}</h1><p>${page === "Dashboard" ? "Your little companion is ready to make your day a little brighter." : subheading(page)}</p></div><span class="live-pill"><span class="status-dot"></span><span id="running-label">${state.hidden ? "Cat hidden" : state.systemPaused ? "Fullscreen pause" : state.paused ? "Taking a break" : "Companion active"}</span></span></div><div id="host-notice" class="host-notice" role="alert" ${state.healthError ? "" : "hidden"}></div><div id="content">${content()}</div><footer><span>${icon("heart", 13)} A happy cat. A happier workspace.</span><span>Designed to keep you company, not get in your way.</span></footer></div></main><div id="toast" role="status"></div>`;
    const notice = document.querySelector("#host-notice");
    if (notice) notice.textContent = state.healthError || "";
    bind();
    mountScene();
  }
  function subheading(p) {
    return (
      {
        Behavior: "A curious little personality, made just right for you.",
        Appearance: "Make your companion feel a little more like yours.",
        "Toys & play": "A little play goes a long way.",
        General: "A good companion fits into your routine.",
        "Help & about":
          "Everything you need to know about your little companion.",
      }[p] || ""
    );
  }
  function content() {
    if (page === "Dashboard")
      return `<section class="dashboard-top"><div class="preview-card"><div class="preview-top"><span class="mini-tag">${icon("paw", 14)} MEET YOUR COMPANION</span><button class="text-button" data-page="Appearance">Customize ${icon("arrow", 14)}</button></div><div class="preview-backdrop"><div class="halo halo-one"></div><div class="halo halo-two"></div><span class="sparkle s1">✧</span><span class="sparkle s2">✦</span><canvas id="cat" aria-label="Interactive 3D kitten preview"></canvas><div class="cat-caption"><span class="status-dot"></span><span id="preview-state">${state.paused ? "Resting" : "Feeling curious"}</span></div></div><div class="preview-bottom"><div><h2>Mochi <span>YOUR DESKTOP KITTEN</span></h2><p>A tiny friend for your everyday adventures.</p></div><span class="coat-badge">${icon("paw", 14)} ${coatName()}</span></div></div><div class="right-stack"><section class="card companion-status"><div class="card-heading"><h2>Companion status</h2><span class="soft-icon">${icon("heart", 18)}</span></div><div class="status-line"><span class="status-dot"></span><strong id="status-text">${state.hidden ? "Hidden" : state.systemPaused ? "Fullscreen pause" : state.paused ? "Paused" : "Happy & exploring"}</strong></div><div class="stat-row"><span>Current behavior</span><b id="behavior">${state.telemetry.behavior}</b></div><div class="stat-row"><span>Rendering</span><b><span class="status-dot"></span> <span id="fps">—</span> FPS</b></div><div class="stat-row"><span>Performance mode</span><b>${state.settings.quality === "high" ? "High quality" : state.settings.quality === "economy" ? "Economy" : "Balanced"} <span class="small-leaf">⌁</span></b></div><div class="status-note">${icon("check", 14)} ${native ? (state.systemPaused ? "Paused for fullscreen / game" : "Running quietly in your system tray") : "Live 3D preview · desktop app required"}</div></section><section class="card quick-controls"><h2>Quick controls</h2><div class="quick-grid"><button data-command="${state.paused ? "resume" : "pause"}">${icon(state.paused ? "play" : "pause", 21)}<span>${state.paused ? "Resume cat" : "Pause cat"}</span></button><button data-command="${state.hidden ? "show" : "hide"}">${icon("eye", 21)}<span>${state.hidden ? "Show cat" : "Hide cat"}</span></button><button data-command="restart">${icon("restart", 21)}<span>Restart cat</span></button></div><button class="primary wide" data-command="${state.hidden ? "show" : state.paused ? "resume" : "pause"}">${icon(state.paused || state.hidden ? "play" : "pause", 16)} ${state.hidden ? "Bring Mochi back" : state.paused ? "Let’s explore again" : "Give Mochi a little break"}</button></section></div></section><section class="card behavior-card"><div class="card-heading"><div><h2>A little personality</h2><p>Let Mochi be curious, playful, and wonderfully cat.</p></div><button class="text-button" data-page="Behavior">All behavior settings ${icon("arrow", 15)}</button></div><div class="behavior-options">${miniSetting("mouseTracking", "eye", "Curious eyes", "Follows your mouse with interest")}${miniSetting("cursorChasing", "paw", "Playful paws", "A little chase, a little mischief")}${miniSetting("randomWalking", "spark", "Free to explore", "Wanders at their own pace")}</div></section><section class="bottom-grid"><div class="play-banner"><span class="toy-illustration">${icon("ball", 38)}</span><div><h3>A little playtime?</h3><p>A tiny toy. A whole lot of excitement.</p></div><button class="secondary" data-toy>Bring out a toy ${icon("arrow", 14)}</button></div><div class="tip-card"><span class="tip-icon">${icon("spark", 22)}</span><div><span class="eyebrow">A FRIENDLY LITTLE TIP</span><p>Mochi won’t get in your way. Your clicks pass right through to your desktop.</p></div></div></section>`;
    if (page === "Behavior")
      return `<div class="settings-grid"><section class="card settings-card"><h2>Natural curiosity</h2>${toggle("randomWalking", "Free to explore", "Wander around the desktop at a natural pace.")}${toggle("mouseTracking", "Mouse tracking", "Follow the cursor with eyes and head.")}${toggle("cursorChasing", "Cursor chasing", "Approach the cursor without covering it.")}${toggle("pawInteraction", "Playful paws", "Reach, tap, and pounce when the cursor is close.")}${toggle("clickToPlay", "Investigate clicks", "Notice desktop clicks without blocking their normal action.")}</section><section class="card settings-card"><h2>Find the right rhythm</h2>${slider("speed", "Movement speed", 0.3, 2, 0.1, "×")}${slider("activity", "Activity level", 0, 100, 1, "%")}${slider("detectionDistance", "Detection distance", 80, 700, 10, " px")}${slider("animationFrequency", "Playfulness", 10, 100, 1, "%")}<div class="info-note">Changes apply immediately. Mochi keeps a comfortable distance from your cursor.</div></section></div>`;
    if (page === "Appearance")
      return `<div class="settings-grid"><section class="card settings-card"><h2>A coat to fall in love with</h2><p class="muted">Same little personality. A fresh new look.</p><div class="coat-options">${["cream", "orange", "grey", "black", "white"].map((c) => `<button data-coat="${c}" class="coat-option ${state.settings.appearance === c ? "selected" : ""}"><span style="--coat:${{ cream: "#e4c8a4", orange: "#c98647", grey: "#939aa5", black: "#363a42", white: "#eeeae2" }[c]}">${c === state.settings.appearance ? icon("check", 16) : ""}</span>${c[0].toUpperCase() + c.slice(1)}</button>`).join("")}</div><canvas id="cat" class="appearance-preview" aria-label="Cat appearance preview"></canvas></section><section class="card settings-card"><h2>The little details</h2>${slider("size", "Companion size", 0.6, 1.6, 0.1, "×")}<div class="setting-row"><div><strong>Render quality</strong><p>Balance detail and battery life.</p></div><select id="quality"><option value="economy">Economy</option><option value="balanced">Balanced</option><option value="high">High quality</option></select></div>${toggle("shadows", "Soft shadows", "A subtle shadow beneath your companion.")}${slider("fpsLimit", "Frame rate limit", 15, 60, 15, " FPS")}<div class="info-note">This release uses an original procedural 3D kitten. Photorealistic fur and rigged character assets are not included.</div></section></div>`;
    if (page === "Toys & play")
      return `<section class="card settings-card"><h2>A playful little world</h2>${toggle("toys", "Virtual toys", "Enable a bouncing ball on your desktop and in the preview.")}${toggle("clickToPlay", "Click-to-play", "Investigate global desktop click positions on Windows.")}<div class="toy-stage"><canvas id="cat" aria-label="Play preview"></canvas></div><button class="primary" data-toy>${icon("ball", 18)} Play with a ball</button><p class="muted">The desktop app creates a bouncing ball beside Mochi. Balls expire automatically after 30 seconds; turning toys off removes them immediately.</p></section>`;
    if (page === "General")
      return `<div class="settings-grid"><section class="card settings-card"><h2>At home on your desktop</h2>${toggle("startWithWindows", "Start with Windows", "Welcome you when you sign in.")}${toggle("minimizeToTray", "Keep in the system tray", "Closing the panel keeps your companion running.")}${toggle("alwaysOnTop", "Always on top", "Keep the kitten above ordinary windows.")}${toggle("rememberSettings", "Remember my preferences", "Restore your settings next time.")}${toggle("pauseFullscreen", "Pause for fullscreen apps", "Hide and pause the cat while a foreground app fills a display.")}${toggle("pauseGames", "Pause for detected games", "Use the Windows Direct3D fullscreen notification when available.")}${toggle("autoQuality", "Adaptive quality", "Lower rendering resolution on battery or sustained low frame rate.")}</section><section class="card settings-card"><h2>A quiet companion</h2><div class="info-note">${icon("sound", 20)} This release is silent. No audio plays in the background.</div><h2 class="section-gap">A fresh start</h2><p class="muted">Restore the original appearance and behavior settings.</p><button class="secondary" data-command="defaults">${icon("restart", 16)} Restore defaults</button><hr><button class="danger" data-command="exit">Exit application</button><p class="muted">${native ? "The tray menu can reopen this panel at any time." : "Startup, tray, overlay and global input require the Windows desktop app."}</p></section></div>`;
    return `<section class="card settings-card about"><span class="about-paw">${icon("paw", 48)}</span><h2>Desktop Cat</h2><p>Your little 3D desktop companion · v0.2.0</p><h3>Meet Mochi</h3><p>An original procedural kitten with cursor-aware behavior. Use the separate control panel or tray to manage your companion. Clicking the kitten never opens a menu.</p><h3>What this build can and can’t do</h3><p>The Windows app provides transparent click-through overlays, passive Windows mouse-hook observation, tray controls, settings persistence and startup integration. A browser only previews the kitten and settings.</p><p>One kitten explores connected monitors, with a bouncing desktop ball, passive native click observation, adaptive render quality and fullscreen/game pausing. Photorealistic fur assets, authored skeletal animations and audio remain unfinished. Disconnected monitor layouts cannot be crossed without using Restart cat on the desired display.</p><p>Windows 10/11, mixed DPI, fullscreen behavior and installer verification require real Windows testing. This development build is not a production-certified release.</p><div class="info-note">${native ? (state.nativeClicks ? "Native click observation is available." : "Native click observation is unavailable on this device.") : "You’re in browser preview. No desktop input is monitored."}</div></section>`;
  }
  function miniSetting(key, i, title, desc) {
    return `<div class="mini-setting"><span class="feature-icon">${icon(i, 20)}</span><div><strong>${title}</strong><p>${desc}</p></div><button class="switch ${state.settings[key] ? "on" : ""}" role="switch" aria-label="${title}" aria-checked="${state.settings[key]}" data-toggle="${key}"><span></span></button></div>`;
  }
  function coatName() {
    return {
      cream: "Cream shorthair",
      orange: "Ginger shorthair",
      grey: "Grey shorthair",
      black: "Black shorthair",
      white: "White shorthair",
    }[state.settings.appearance];
  }
  async function update(values, rerender = true) {
    if (native) state = await native.settings(values);
    else {
      state.settings = { ...state.settings, ...values };
      if (state.settings.rememberSettings)
        localStorage.setItem("desktop-cat", JSON.stringify(state.settings));
      else localStorage.removeItem("desktop-cat");
    }
    if (rerender) shell();
  }
  async function command(cmd) {
    if (cmd === "exit" && !native) {
      toast("Close this browser tab to leave the preview.");
      return;
    }
    if (cmd === "defaults" && !confirm("Restore all default preferences?"))
      return;
    if (native) state = await native.command(cmd);
    else {
      if (cmd === "pause") state.paused = true;
      if (cmd === "resume") state.paused = false;
      if (cmd === "hide") state.hidden = true;
      if (cmd === "show") state.hidden = false;
      if (cmd === "restart") {
        state.paused = false;
        state.hidden = false;
      }
      if (cmd === "defaults") await update(defaults, false);
    }
    shell();
    toast(
      {
        pause: "Mochi is taking a little break.",
        resume: "Ready for a little adventure.",
        hide: "Mochi is tucked away.",
        show: "Welcome back, Mochi.",
        restart: "A fresh little start.",
        defaults: "Default preferences restored.",
      }[cmd] || "Updated",
    );
  }
  function bind() {
    document.querySelectorAll("[data-page]").forEach(
      (b) =>
        (b.onclick = () => {
          page = b.dataset.page;
          shell();
        }),
    );
    document.querySelectorAll("[data-toggle]").forEach(
      (b) =>
        (b.onclick = () => {
          const k = b.dataset.toggle;
          if (
            !native &&
            [
              "startWithWindows",
              "minimizeToTray",
              "alwaysOnTop",
              "pauseFullscreen",
            ].includes(k)
          ) {
            toast("This setting requires the Windows desktop application.");
            return;
          }
          update({ [k]: !state.settings[k] });
        }),
    );
    document
      .querySelectorAll("[data-command]")
      .forEach((b) => (b.onclick = () => command(b.dataset.command)));
    document.querySelectorAll("[data-range]").forEach((b) => {
      b.oninput = () => {
        document.getElementById(b.id + "-value").textContent =
          b.value +
          ({
            size: "×",
            speed: "×",
            activity: "%",
            animationFrequency: "%",
            detectionDistance: " px",
            fpsLimit: " FPS",
          }[b.id] || "");
      };
      b.onchange = () => update({ [b.dataset.range]: +b.value }, false);
    });
    document
      .querySelectorAll("[data-coat]")
      .forEach(
        (b) => (b.onclick = () => update({ appearance: b.dataset.coat })),
      );
    const q = document.querySelector("#quality");
    if (q) {
      q.value = state.settings.quality;
      q.onchange = () => update({ quality: q.value });
    }
    document.querySelectorAll("[data-toy]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!state.settings.toys) {
            toast("Enable virtual toys first.");
            return;
          }
          if (page !== "Toys & play") {
            page = "Toys & play";
            shell();
          }
          if (native) await native.command("toy");
          toyUntil = performance.now() + 12000;
          toast("A little playtime!");
        }),
    );
  }
  let mouse = { x: 0, y: 0 };
  function mountScene() {
    cancelAnimationFrame(frame);
    scene?.dispose();
    scene = null;
    const canvas = document.querySelector("#cat");
    if (!canvas) return;
    try {
      scene = createCatScene(canvas);
    } catch (e) {
      canvas.replaceWith(
        Object.assign(document.createElement("p"), {
          textContent:
            "3D preview unavailable. Please enable WebGL or update your graphics driver.",
        }),
      );
      return;
    }
    canvas.onpointermove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse = {
        x: (e.clientX - r.left - r.width / 2) / (r.width / 2),
        y: (e.clientY - r.top - r.height / 2) / (r.height / 2),
      };
    };
    canvas.onpointerleave = () => (mouse = { x: 0, y: 0 });
    canvas.onclick = () => {
      if (state.settings.pawInteraction) toyUntil = performance.now() + 1400;
    };
    last = 0;
    renderAt = 0;
    fpsStart = performance.now();
    frames = 0;
    let elapsed = 0;
    function loop(now) {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000 || 0);
      last = now;
      if (!state.paused) elapsed += dt;
      if (now - renderAt < 1000 / state.settings.fpsLimit) return;
      renderAt = now;
      const playing = now < toyUntil;
      currentBehavior = playing
        ? page === "Toys & play"
          ? "Playing"
          : "Pawing"
        : state.paused
          ? "Sitting"
          : Math.floor(elapsed / 9) % 4 === 3
            ? "Grooming"
            : "Idle";
      canvas.style.opacity = state.hidden ? 0 : 1;
      scene.render(
        elapsed,
        currentBehavior,
        state.settings,
        state.settings.mouseTracking ? mouse : { x: 0, y: 0 },
      );
      frames++;
      if (now - fpsStart > 1000) {
        const fps = Math.round((frames * 1000) / (now - fpsStart));
        const el = document.querySelector("#fps");
        if (el) el.textContent = native ? state.telemetry.fps : fps;
        const b = document.querySelector("#behavior");
        if (b)
          b.textContent = native ? state.telemetry.behavior : currentBehavior;
        frames = 0;
        fpsStart = now;
      }
    }
    requestAnimationFrame(loop);
  }
  function toast(text) {
    const t = document.querySelector("#toast");
    t.textContent = text;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }
  native?.onState((s) => {
    const changed =
      state.paused !== s.paused ||
      state.hidden !== s.hidden ||
      state.systemPaused !== s.systemPaused ||
      state.healthError !== s.healthError ||
      JSON.stringify(state.settings) !== JSON.stringify(s.settings);
    state = s;
    if (changed) shell();
    const f = document.querySelector("#fps"),
      b = document.querySelector("#behavior");
    if (f) f.textContent = s.telemetry.fps;
    if (b) b.textContent = s.telemetry.behavior;
  });
  shell();
}
