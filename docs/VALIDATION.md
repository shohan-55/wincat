# Desktop Cat v0.3.0 — validation record

Date: 2026-11-05

## Current anatomy / animation rewrite

Source revision: `fceb990` on `arena/5ade095f-wincat`.

- [Complete Windows + Linux test run](https://github.com/shohan-55/wincat/actions/runs/42074728797): **passed**.
- [Download v0.3 Windows x64 artifact ZIP](https://github.com/shohan-55/wincat/actions/runs/42074728797/artifacts/13439315017).

The ZIP includes `Desktop-Cat-0.3.0-Setup-x64.exe`, `Desktop-Cat-0.3.0-Portable-x64.exe`, `SHA256SUMS.txt` and `smoke-report.json`.

Verified: 28 unit tests, 8 Chromium/WebGL tests, Windows native-hook self-test, packaged app launch/WebGL/transparency/lifecycle/settings smoke checks. Both jobs passed. See [MOTION.md](MOTION.md) for the anatomical/motion changes, preview controls and remaining realism limitations. These tests validate the mechanics and launch behavior, not photorealism or physical Windows 10/11 acceptance.

The application is still an unsigned pre-release with a procedural character. Professional character modeling/rigging/grooming and real-device visual/performance review remain release gates.

---

# Historical v0.2.0 validation record

Date: 2026-11-05

## Windows build available

Source revision: `f137f9e` on `arena/5ade095f-wincat`.

- [Windows build and packaged-app checks](https://github.com/shohan-55/wincat/actions/runs/42063647841/job/127371735193): **passed**.
- [Download Windows x64 artifact ZIP](https://github.com/shohan-55/wincat/actions/runs/42063647841/artifacts/13432609384).

The ZIP contains:

- `Desktop-Cat-0.2.0-Setup-x64.exe`
- `Desktop-Cat-0.2.0-Portable-x64.exe`
- `SHA256SUMS.txt`
- `smoke-report.json`

These are unsigned pre-release binaries, not a production-certified release. GitHub login/repository access may be required to download. GitHub Actions artifacts expire according to repository retention settings.

## Verified

- Local: 19 unit tests and 6 Chromium/WebGL integration tests pass.
- Production renderer build passes; production dependency audit reports no advisories at validation time.
- Windows runner: C++ compilation/linking, NSIS installer creation, portable EXE creation, passive-hook installation self-test, packaged application launch, WebGL context, transparent HTML/background configuration, nonfocusable/always-on-top pet, pause/resume, hide/show, settings persistence and native observer connection pass.
- The packaged-app smoke test launches the unpacked application. It does **not** run the installer or prove physical desktop click-through behavior.

The Windows package job passed independently of the workflow's Linux job. At artifact publication the latest Linux job was still downloading/installing browser dependencies; the same UI source passed the prior workflow's Linux checks and the local 25-test suite. Consult the linked run for its final overall status.

## Still required

Real Windows 10/11 installation/uninstallation, physical input pass-through, mixed-DPI/hotplug/4K checks, exclusive-fullscreen compatibility and long-duration resource measurements. The included kitten is stylized procedural geometry with original 4K microdetail, not the requested photorealistic, professionally furred and skeletally rigged character. See README for the full release checklist and limitations.

No signing key, release publishing token or administrator privileges were used to build the artifact. The initial packaging failure was automatic release publishing requiring a GitHub token; `--publish never` fixes that without adding credentials.
