import { expect, test } from "@playwright/test";

test.describe("Study OS workspace", () => {
  test("root redirects to the Chinese home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/zh-CN$/);
    await expect(page.getByRole("heading", { level: 1, name: "Study OS" })).toBeVisible();
  });

  test("zh-CN home shows the workspace and connected API", async ({ page }) => {
    await page.goto("/zh-CN");
    await expect(page.getByRole("heading", { level: 2, name: "学习空间" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("API 已连接");
    await page.screenshot({ path: "test-results/zh-CN-home.png", fullPage: true });
  });

  test("en home renders English copy", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 2, name: "Learning spaces" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("API connected");
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

  test("creates a space and keeps it after reload", async ({ page }) => {
    await page.goto("/zh-CN");
    await expect(page.getByRole("heading", { level: 2, name: "学习空间" })).toBeVisible();

    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const name = `测试空间-${Date.now()}`;
    await page.getByLabel("空间名称，例如：高等数学").fill(name);
    await page.getByRole("button", { name: "创建空间" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    const cachedCount = await page.evaluate(async () => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("study-os");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("spaces", "readonly");
          const all = transaction.objectStore("spaces").getAll();
          all.onsuccess = () => resolve(all.result.length);
          all.onerror = () => reject(all.error);
        };
      });
    });
    expect(cachedCount).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/workspace-with-space.png", fullPage: true });
  });

  test("creates a course, a task and a calendar event inside a space", async ({ page }) => {
    await page.goto("/zh-CN");
    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const suffix = Date.now();
    const spaceName = `空间-${suffix}`;
    const courseName = `课程-${suffix}`;
    const taskTitle = `任务-${suffix}`;
    const eventTitle = `事件-${suffix}`;

    await page.getByLabel("空间名称，例如：高等数学").fill(spaceName);
    await page.getByRole("button", { name: "创建空间" }).click();
    await page.getByRole("link", { name: new RegExp(spaceName) }).click();
    await expect(page).toHaveURL(/\/spaces\/[0-9a-f-]+$/);

    await page.getByLabel("课程名称，例如：高等数学").fill(courseName);
    await page.getByRole("button", { name: "添加课程" }).click();
    await expect(page.getByText(courseName).first()).toBeVisible();

    await page.getByLabel("任务标题，例如：完成第一章习题").fill(taskTitle);
    await page.getByRole("button", { name: "添加任务" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
    await page.getByRole("button", { name: "完成" }).click();
    await expect(page.getByRole("button", { name: "恢复" })).toBeVisible();

    await page.getByLabel("事件标题，例如：期中考试").fill(eventTitle);
    await page.getByLabel("开始时间").fill("2026-11-10T09:00");
    await page.getByLabel("结束时间").fill("2026-11-10T11:00");
    await page.getByRole("button", { name: "添加事件" }).click();
    await expect(page.getByText(eventTitle)).toBeVisible();

    await page.screenshot({ path: "test-results/space-detail.png", fullPage: true });
  });
});
