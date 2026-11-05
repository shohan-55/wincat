# Desktop Cat — Your Little 3D Desktop Companion

An Electron + Three.js Windows desktop companion with a separate control panel and an original procedural kitten named **Mochi**.

**v0.2.0 — development / pre-release.** The product's photorealistic, professionally rigged kitten is not included. Windows packaging and automated launch smoke tests run through GitHub Actions; see the workflow results for the exact build status. Real Windows 10/11 desktop acceptance testing remains required before calling this production-ready.

## Run

Node.js 22+ is required **for development only**.

```sh
npm ci
npm run dev       # browser control-panel preview, http://localhost:5173
npm test          # deterministic behavior, monitor-route and toy-physics tests
npx playwright install chromium
npm run test:browser
```

For the actual desktop app, open an **x64 Native Tools command prompt for Visual Studio** on Windows (Visual Studio Build Tools with Desktop C++ workload):

```powershell
npm run build:native
npm start
```

A browser preview cannot create a desktop overlay, monitor global input, start with Windows or provide a tray. FPS is measured, not simulated.

## Windows installer and portable build

From the same Windows developer prompt:

```powershell
npm ci
npm run dist:win
```

Expected outputs:

- `release/Desktop-Cat-0.2.0-Setup-x64.exe` — per-user NSIS installer, installation directory selection, desktop/Start Menu shortcuts and uninstaller.
- `release/Desktop-Cat-0.2.0-Portable-x64.exe` — portable launcher. Startup integration is intentionally disabled in the portable build.

End users do not need Node.js, Python, Visual Studio or .NET. Electron and the statically linked C++ helper are bundled. Normal operation requires no administrator privileges. These builds are **unsigned**; SmartScreen may warn. Production distribution requires signing, versioned releases and real-device verification.

### GitHub Actions

**Windows build** runs on the session branch, manual dispatch, or a `v*` tag:

1. Linux unit tests + Chromium/WebGL integration tests.
2. Windows x64 native helper compilation and NSIS/portable packaging.
3. Native hook installation self-test.
4. Launch the packaged application and check WebGL startup, overlay configuration, pause/resume, show/hide, persistence and native-hook connection.
5. Upload both EXEs, SHA-256 checksums and the smoke-test JSON report.

The Windows runner is Windows Server, **not** a substitute for Windows 10/11 user acceptance testing. Smoke tests do not prove that physical clicks pass through correctly on a user's desktop.

## What is implemented

- One kitten with a host-owned simulation and a small **360×360 DIP** transparent, borderless, nonfocusable, always-click-through overlay. It does not allocate a full-screen 4K rendering surface for every monitor.
- Global cursor tracking, chasing with a stopping distance, paw/pounce reactions, click investigation, surprised recoil and varied idle states. Input is never injected or modified.
- Monitor-aware routing through adjacent display seams, including negative origins and L-shaped layouts. One kitten—not a separate copy per monitor. Disconnected displays are deliberately not crossed via teleportation; use Restart cat with the panel on the desired display.
- Bouncing desktop ball, friction, wall collisions, paw impulses, 30-second expiry and immediate removal when disabled. Ball input is also click-through.
- Five coat colors, smooth procedural pose blending, blinking, head/ear/tail motion, yawning, stretching, grooming, sleeping and gait poses. High quality loads an original **4096×4096 fur microdetail bump texture**; lower modes use 1024×1024. This is not a realistic hair groom or a 4K scanned character.
- Separate dashboard, controls, settings, local persistence, tray commands, Windows login startup and defaults restore. No menu opens from the cat.
- Native fullscreen-window detection and Windows Direct3D-fullscreen notification detection; configurable automatic hiding/pausing. Battery-aware and sustained-low-FPS quality reduction with gradual recovery.
- Reduced rendering while sleeping/paused; hidden/fullscreen pets stop rendering. Main simulation pauses while hidden. Renderer-crash/context-loss recovery is bounded to three retries, then a visible error rather than an infinite restart loop.

## Architecture

- `src/electron/main.cjs`: lifecycle, a single simulation, small pet/toy windows, settings, tray, startup and IPC sender validation.
- `native/input.cpp`: passive `WH_MOUSE_LL` observer on its own Win32 message-pump thread. Hook callbacks enqueue bounded metadata and immediately call `CallNextHookEx`. Coordinates are physical pixels converted to DIP by Electron. It never records keys, window titles, input contents or cursor trails.
- `src/electron/native-observer.cjs`: bounded line protocol, health reporting, supervised retries, parent-lifetime cleanup. The helper is built with `/MT`, so no separate VC++ runtime installer is needed.
- `src/shared/brain.mjs`, `world.mjs`, `toy.mjs`: renderer-independent behavior, path planning and physics, injectable RNG, deterministic tests.
- `src/ui/cat.js`: original procedural PBR kitten and pose blending; all materials/geometries/textures and WebGL contexts are disposed when navigating.
- `src/shared/defaults.json`: one settings-default source for host and preview. The host validates settings and persists using atomic replacement.

Electron was chosen for reliable transparent/click-through Windows surfaces, tray/display APIs and a bundled renderer. It uses more memory than a custom C# / Direct3D host; strict low-memory targets may justify replacing the host later. Rendering and native integration remain separate for that reason.

Context isolation, renderer sandboxing, a narrow preload API, sender validation, denied permissions, blocked navigation/new windows and a content security policy are enabled. Normal operation is offline. No account or telemetry service exists.

## Tests

```sh
npm test               # 15 tests
npm run test:browser   # 4 browser integration tests
npm run build
npm audit --omit=dev
```

Browser tests support `CHROMIUM_PATH` for an existing Chromium. Software-WebGL tests verify functionality, not desktop GPU FPS. Regenerate the original fur art with `python scripts/generate-fur.py` (Pillow is needed only for art regeneration).

## Remaining release gates and limitations

- A professional, realistically proportioned, furred and skeletally rigged kitten with authored walk/run/jump transitions is still required for the original visual target. The included character is visibly stylized and procedural.
- No sounds, feather/laser/mouse-shaped toys, auto-updates or installer signing. Sound was optional; this version is silent.
- No proof of 60 FPS, battery budget, long-session memory stability or performance on low-end GPUs. Automatic quality heuristics are not a substitute for hardware measurements.
- Window/fullscreen/game detection is heuristic. Exclusive-fullscreen, elevated apps, UAC secure desktop, unusual compositors and mixed-DPI setups need real-device tests. The hook does not monitor the Windows secure desktop.
- Different monitor scaling can cause native-window size changes at seams; this is not yet certified on mixed-DPI hardware.
- Native-hook startup failures are shown on Help; input is not silently replaced with fake clicks. Cursor tracking still works without the helper, but click investigation does not.

### Required real-device release acceptance tests

- [ ] Install/uninstall and portable launch on Windows 10 x64 and Windows 11 x64, standard user, no development tools.
- [ ] Desktop icons and application controls beneath the cat remain clickable; no focus theft or blocked double-clicks.
- [ ] Tray reopen/exit, startup registration and uninstall cleanup, settings recovery and persistence.
- [ ] Fast global clicks, cursor chasing/paw/pounce, ball play, pause/resume/show/hide/restart.
- [ ] 1080p/4K, 100/125/150/200% DPI, negative monitor origins, L-shaped layouts and hotplug.
- [ ] Borderless and exclusive fullscreen games/video, suspend/resume, lock/unlock and display sleep.
- [ ] One-hour CPU/GPU/memory/battery testing, repeated navigation, GPU loss and low-end GPU fallback.
- [ ] Code-signing and SmartScreen verification.

Unfinished or unverified requirements are not represented as completed production features.
