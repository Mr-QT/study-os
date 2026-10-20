import { expect, test } from "@playwright/test";

test.describe("Study OS notes, focus and files", () => {
  test("records a note, a focus session and an uploaded file", async ({ page }) => {
    await page.goto("/zh-CN");
    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const suffix = Date.now();
    const spaceName = `工具空间-${suffix}`;
    await page.getByLabel("空间名称，例如：高等数学").fill(spaceName);
    await page.getByRole("button", { name: "创建空间" }).click();
    await page.getByRole("link", { name: new RegExp(spaceName) }).click();
    await expect(page).toHaveURL(/\/spaces\/[0-9a-f-]+$/);

    await expect(page.getByRole("heading", { level: 3, name: "学习统计" })).toBeVisible();
    await expect(page.getByText("AI 未配置")).toBeVisible();

    await page.getByLabel("笔记标题").fill(`极限笔记-${suffix}`);
    await page
      .getByLabel("用 Markdown 记录内容…")
      .fill("# 极限\n\n- ε-δ 语言\n- 夹逼定理");
    await page.getByRole("button", { name: "保存笔记" }).click();
    await expect(page.getByRole("heading", { name: `极限笔记-${suffix}` })).toBeVisible();
    await expect(page.getByText("ε-δ 语言")).toBeVisible();

    await page.getByRole("button", { name: "开始专注" }).click();
    await expect(page.getByRole("button", { name: "结束专注" })).toBeVisible();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "结束专注" }).click();
    await expect(page.getByRole("button", { name: "开始专注" })).toBeVisible();
    await expect(page.getByText("学习日志（近 7 天）")).toBeVisible();

    await page.getByLabel("选择文件").setInputFiles({
      name: "note.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# 文件内容\n\n- 上传成功", "utf8"),
    });
    await page.getByRole("button", { name: "上传文件" }).click();
    await expect(page.getByRole("link", { name: "note.md" })).toBeVisible();

    await page.screenshot({ path: "test-results/space-tools.png", fullPage: true });
  });
});
