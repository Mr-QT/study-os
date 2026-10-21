import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const locale of ["zh-CN", "en"] as const) {
  test(`${locale} home has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.getByRole("status")).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(
      results.violations,
      JSON.stringify(
        results.violations.map(({ id, impact, nodes }) => ({
          id,
          impact,
          targets: nodes.map((node) => node.target),
        })),
        null,
        2,
      ),
    ).toEqual([]);
  });
}

test("space detail has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/zh-CN");
  const unavailable = page.getByText("数据库未配置");
  if (await unavailable.isVisible().catch(() => false)) {
    test.skip(true, "PostgreSQL is not configured in this environment");
  }

  const name = `无障碍空间-${Date.now()}`;
  await page.getByLabel("空间名称，例如：高等数学").fill(name);
  await page.getByRole("button", { name: "创建空间" }).click();
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    JSON.stringify(
      results.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      })),
      null,
      2,
    ),
  ).toEqual([]);

  await page.screenshot({ path: "test-results/space-a11y.png", fullPage: true });
});

test("home renders without horizontal overflow on phone and tablet", async ({ page }) => {
  for (const viewport of [
    { name: "phone", width: 390, height: 844 },
    { name: "tablet", width: 820, height: 1180 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/zh-CN");
    await expect(page.getByRole("status")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.name} has horizontal overflow`).toBeLessThanOrEqual(0);

    await page.screenshot({
      path: `test-results/${viewport.name}-home.png`,
      fullPage: true,
    });
  }
});
