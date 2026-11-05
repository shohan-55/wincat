const { test, expect } = require("@playwright/test");
test("dashboard renders a real WebGL kitten without script errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Home, sweet desktop." }),
  ).toBeVisible();
  await expect(page.locator("#cat")).toBeVisible();
  await expect.poll(() => page.locator("#fps").textContent()).not.toBe("—");
  expect(
    await page.locator("#cat").evaluate((c) => !!c.getContext("webgl2")),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("pause, resume, hide and show work without menus on the cat", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#cat").click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Pause cat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume cat", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume cat", exact: true }).click();
  await page.getByRole("button", { name: "Hide cat", exact: true }).click();
  await expect(page.locator("#cat")).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "Show cat", exact: true }).click();
  await expect(page.locator("#cat")).toHaveCSS("opacity", "1");
});
test("settings persist and appearance changes apply", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("switch", { name: "Curious eyes" }).click();
  await expect(
    page.getByRole("switch", { name: "Curious eyes" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Curious eyes" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: "Grey", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Grey", exact: true }),
  ).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText("Grey shorthair")).toBeVisible();
});
test("behavior sliders, toy session, general settings and help are reachable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Behavior", exact: true }).click();
  await page.locator("#speed").fill("1.5");
  await page.locator("#speed").dispatchEvent("change");
  await page.getByRole("button", { name: "Toys & play", exact: true }).click();
  await page
    .getByRole("button", { name: "Play with a ball", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("playtime");
  await page.getByRole("button", { name: "General", exact: true }).click();
  await page.getByRole("switch", { name: "Start with Windows" }).click();
  await expect(page.getByRole("status")).toContainText("requires the Windows");
  await page.getByRole("button", { name: "Help & about", exact: true }).click();
  await expect(
    page.getByText("not a production-certified release.", { exact: false }),
  ).toBeVisible();
});

test("high-quality coat streams the bundled 4K detail map", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const detail = page.waitForResponse(
    (r) => r.url().includes("fur-detail-4k") && r.status() === 200,
  );
  await page.locator("#quality").selectOption("high");
  await detail;
  await expect(page.locator("#quality")).toHaveValue("high");
});

test("pet overlay has no opaque HTML background and exposes no controls", async ({
  page,
}) => {
  const settings = require("../../src/shared/defaults.json");
  await page.addInitScript((settings) => {
    window.desktopCat = {
      getState: async () => ({
        settings,
        paused: false,
        hidden: false,
        systemPaused: false,
        telemetry: { fps: 0, behavior: "Idle" },
      }),
      onState: () => {},
      onInput: (cb) => {
        cb({
          snapshot: { state: "Idle", phase: 1, look: { x: 0, y: 0 }, vx: 0 },
        });
      },
      telemetry: () => {},
    };
  }, settings);
  await page.goto("/?overlay=pet");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator('button,nav,[role="dialog"]')).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
});

test("motion preview exposes walk, trot and resting poses without changing preferences", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const name of [
    "Walking",
    "Running",
    "Sitting",
    "Sleeping",
    "Stretching",
    "Grooming",
    "Pawing",
    "Pouncing",
    "Yawning",
    "Idle",
  ]) {
    await page.locator("#motion-preview").selectOption(name);
    await expect(page.locator("#cat")).toHaveAttribute("data-motion", name);
    if (name === "Running")
      await expect(page.locator("#cat")).toHaveAttribute(
        "data-gait",
        "diagonal-trot",
      );
  }
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("desktop-cat")),
  ).toBeNull();
});

test("native vertical movement reaches the quadruped animation renderer", async ({
  page,
}) => {
  const settings = require("../../src/shared/defaults.json");
  await page.addInitScript((settings) => {
    window.desktopCat = {
      getState: async () => ({
        settings,
        paused: false,
        hidden: false,
        systemPaused: false,
      }),
      onState: () => {},
      onInput: (cb) =>
        cb({
          snapshot: {
            state: "Walking",
            phase: 1,
            look: { x: 0, y: 1 },
            vx: 0,
            vy: 85,
          },
        }),
      telemetry: () => {},
    };
  }, settings);
  await page.goto("/?overlay=pet");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-motion",
    "Walking",
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-gait",
    "four-beat-walk",
  );
  await expect(page.locator("canvas")).toBeVisible();
});
