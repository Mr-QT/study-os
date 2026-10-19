import { expect, test } from "@playwright/test";

test.describe("Study OS phase 0 smoke", () => {
  test("root redirects to the Chinese home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/zh-CN$/);
    await expect(page.getByRole("heading", { level: 1, name: "Study OS" })).toBeVisible();
  });

  test("zh-CN home reports a connected API in local mode", async ({ page }) => {
    await page.goto("/zh-CN");
    await expect(page.getByRole("status")).toContainText("API 已连接");
    await expect(page.getByText("未配置（本地模式）")).toBeVisible();
    await page.screenshot({ path: "test-results/zh-CN-home.png", fullPage: true });
  });

  test("en home renders English copy", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 2, name: "System status" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("API connected");
    await expect(page.getByText("Not configured (local mode)")).toBeVisible();
    await page.screenshot({ path: "test-results/en-home.png", fullPage: true });
  });

  test("language switch links the two locales", async ({ page }) => {
    await page.goto("/zh-CN");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("status")).toContainText("API connected");
    await page.getByRole("link", { name: "中文" }).click();
    await expect(page).toHaveURL(/\/zh-CN$/);
  });
});
