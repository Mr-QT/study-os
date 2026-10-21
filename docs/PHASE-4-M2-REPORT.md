# 阶段 4.2 报告：worker、事件钩子、延迟/去重与规则草案

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-21

## 实现

- **事件钩子**：focus 会话结束触发 `focus.completed`；考试提交触发 `exam.submitted`；异常被捕获，不影响主写入。
- **通知延迟/去重**：动作新增 `delayMinutes`、`dedupeKey`；worker 只发送 `scheduled_at <= now` 的站内通知；重复去重键不会重复插入。
- **worker**：`apps/api/src/worker.ts`，`pnpm worker` 启动，每 30 秒调度到期通知，支持 SIGINT/SIGTERM 优雅退出；冒烟发送 4 条。
- **自然语言规则草案**：`POST /api/v1/automation/rules/draft`，AI 输出 JSON 后由服务端 schema 校验，记录审计；非法输出返回 422；Web 支持生成→预览→保存。
- **冲突重试**：任务 PATCH 409 时拉取最新版本并自动重试一次，仍失败才提示冲突。
- **无障碍**：新增空间详情页 axe WCAG A/AA 回归。

## 测试

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 78 passed（contracts 10、api 68） |
| `pnpm test:e2e` | 13 passed |
| `pnpm worker` | 启动并发送到期通知 |

新增 `apps/api/test/automation-2.integration.test.ts`（4 个）：focus 事件、exam 事件、延迟+去重、规则草案。

## 未完成

- 邮件/PWA 投递（需要凭据，BLOCKED）
- 规则草案审批/落库 UI
- 高级日历/通知、对象存储、字段级冲突合并

## 用户验收结果

待确认。
