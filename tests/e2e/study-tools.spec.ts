import { expect, test } from "@playwright/test";

function buildPdf(): Buffer {
  const content = "BT /F1 18 Tf 40 120 Td (Study OS PDF) Tj ET\n";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}

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
    await expect(page.getByRole("heading", { level: 3, name: "AI 学习助手" })).toBeVisible();

    await page.getByLabel("笔记标题").fill(`极限笔记-${suffix}`);
    await page
      .getByLabel("用 Markdown 记录内容…")
      .fill("# 极限\n\n- ε-δ 语言\n- 夹逼定理");
    await page.getByRole("button", { name: "保存笔记" }).click();
    await expect(page.getByRole("heading", { name: `极限笔记-${suffix}` })).toBeVisible();
    await expect(page.getByText("ε-δ 语言")).toBeVisible();

    await page.getByLabel("题目，例如：什么是极限？").fill(`题目-${suffix}`);
    await page.getByLabel("标准答案").fill("当自变量趋近某值时函数值趋近的确定值");
    await page.getByRole("button", { name: "添加题目" }).click();
    await expect(page.getByText(`题目-${suffix}`).first()).toBeVisible();

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

  test("queues an offline task toggle and replays it after reconnect", async ({ page, context }) => {
    await page.goto("/zh-CN");
    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const suffix = Date.now();
    const spaceName = `离线空间-${suffix}`;
    await page.getByLabel("空间名称，例如：高等数学").fill(spaceName);
    await page.getByRole("button", { name: "创建空间" }).click();
    await page.getByRole("link", { name: new RegExp(spaceName) }).click();
    await expect(page).toHaveURL(/\/spaces\/[0-9a-f-]+$/);

    await page.getByLabel("任务标题，例如：完成第一章习题").fill(`离线任务-${suffix}`);
    await page.getByRole("button", { name: "添加任务" }).click();
    await expect(page.getByText(`离线任务-${suffix}`)).toBeVisible();

    await context.setOffline(true);
    await page.getByRole("button", { name: "完成" }).click();
    await expect(page.getByText("离线更改待同步")).toBeVisible();

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByText("离线更改待同步")).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByRole("button", { name: "恢复" })).toBeVisible();
  });

  test("opens a PDF and saves an annotation", async ({ page }) => {
    await page.goto("/zh-CN");
    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const suffix = Date.now();
    const spaceName = `PDF空间-${suffix}`;
    await page.getByLabel("空间名称，例如：高等数学").fill(spaceName);
    await page.getByRole("button", { name: "创建空间" }).click();
    await page.getByRole("link", { name: new RegExp(spaceName) }).click();
    await expect(page).toHaveURL(/\/spaces\/[0-9a-f-]+$/);

    await page.getByLabel("选择文件").setInputFiles({
      name: "paper.pdf",
      mimeType: "application/pdf",
      buffer: buildPdf(),
    });
    await page.getByRole("button", { name: "上传文件" }).click();
    await expect(page.getByRole("link", { name: "paper.pdf" })).toBeVisible();

    await page.getByRole("button", { name: "查看 / 标注" }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => page.locator("canvas").evaluate((canvas) => (canvas as HTMLCanvasElement).width), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);

    await page.locator("canvas").click({ position: { x: 60, y: 60 } });
    await page.getByLabel("标注笔记（可选）").fill("重点定义");
    await page.getByRole("button", { name: "保存标注" }).click();
    await expect(page.getByText("重点定义")).toBeVisible();

    await page.screenshot({ path: "test-results/pdf-annotation.png", fullPage: true });
  });

  test("creates a goal and checks in a habit", async ({ page }) => {
    await page.goto("/zh-CN");
    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const suffix = Date.now();
    const spaceName = `成长空间-${suffix}`;
    await page.getByLabel("空间名称，例如：高等数学").fill(spaceName);
    await page.getByRole("button", { name: "创建空间" }).click();
    await page.getByRole("link", { name: new RegExp(spaceName) }).click();
    await expect(page).toHaveURL(/\/spaces\/[0-9a-f-]+$/);

    await page.getByLabel("目标标题，例如：本周专注 300 分钟").fill(`E2E 目标-${suffix}`);
    await page.getByRole("button", { name: "添加目标" }).click();
    await expect(page.getByText(`E2E 目标-${suffix}`)).toBeVisible();

    await page.getByLabel("习惯，例如：每天复习 10 分钟").fill(`E2E 习惯-${suffix}`);
    await page.getByRole("button", { name: "添加习惯" }).click();
    await expect(page.getByText(`E2E 习惯-${suffix}`)).toBeVisible();

    await page.getByRole("button", { name: "打卡" }).first().click();
    await expect(page.getByText(/今日 1/)).toBeVisible();

    await page.screenshot({ path: "test-results/growth.png", fullPage: true });
  });

  test("imports tasks from CSV with preview and commit", async ({ page }) => {
    await page.goto("/zh-CN");
    const unavailable = page.getByText("数据库未配置");
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "PostgreSQL is not configured in this environment");
    }

    const suffix = Date.now();
    const spaceName = `迁移空间-${suffix}`;
    await page.getByLabel("空间名称，例如：高等数学").fill(spaceName);
    await page.getByRole("button", { name: "创建空间" }).click();
    await page.getByRole("link", { name: new RegExp(spaceName) }).click();
    await expect(page).toHaveURL(/\/spaces\/[0-9a-f-]+$/);

    await page
      .getByLabel("或直接粘贴 CSV，第一行必须是表头")
      .fill(`title,notes\nCSV任务-${suffix},来自端到端\n`);
    await page.getByRole("button", { name: "预览" }).click();
    await expect(page.getByText(/共 1 行/)).toBeVisible();
    await page.getByRole("button", { name: "确认导入" }).click();
    await expect(page.getByText(/已创建 1 条/)).toBeVisible();
    await expect(page.getByText(/committed/)).toBeVisible();

    await page.screenshot({ path: "test-results/migration.png", fullPage: true });
  });
});
