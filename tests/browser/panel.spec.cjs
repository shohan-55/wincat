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
