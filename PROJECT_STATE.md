# PROJECT_STATE — 真实项目状态

- 日期：2026-10-21
- 当前阶段：4 — 智能日程与自动化（4.1/4.2 完成）
- 当前里程碑：4.1 规则/通知中心；4.2 worker、focus/exam 事件、延迟/去重、AI 规则草案、冲突重试、空间页无障碍
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 78 通过（contracts 10、api 68）；Playwright 13 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），25 张表，迁移 0000–0010
- 部署状态：未部署
- 最近 commit：本次提交后更新

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js / pnpm / Git | 24.22.0 / 10.34.7 / 2.55.0 |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16-alpine（Docker Compose，端口 5432） |
| Docker / WSL | Engine 29.8.2 / WSL 2.7.13 |
| AI / 嵌入 / PDF | DeepSeek `deepseek-chat` / 本地 MiniLM / pdfjs-dist |

## 已验证命令

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 78 passed（contracts 10、api 68） |
| `pnpm test:e2e` | 13 passed（新增空间页 axe 无障碍） |
| `pnpm worker` | 启动成功，冒烟一次发送 4 条到期通知 |

## 已实现

- 阶段 1–3：学习平台、题库/考试/复习、RAG/PDF、AI 记忆、分析/风险、导师、多 Agent、学习计划、记忆提取。
- 4.1：自动化规则（trigger/conditions/actions）、运行记录、站内通知中心、规则与通知 UI。
- 4.2：
  - 通知延迟（`delayMinutes`）与去重（`dedupeKey`）；
  - `focus.completed`、`exam.submitted` 事件钩子，异常不影响主写入；
  - 独立通知 worker（`pnpm worker`，每 30s 发送到期站内通知，可优雅退出）；
  - 自然语言规则草案 `POST /api/v1/automation/rules/draft`（AI 生成、服务端校验、审计）；
  - 任务 409 冲突自动按最新版本重试一次，失败才提示冲突；
  - 空间详情页 axe WCAG A/AA 回归。

## 未完成项

- 邮件 / PWA 真实投递（需要 SMTP/推送凭据；当前计入 skipped）。
- 规则草案的审批/一键落库 UI（API 已有）。
- 高级日历/通知（重复、勿扰、摘要）。
- 对象存储（当前仅本地磁盘）；冲突合并仍为“重试”而非字段级 diff。
- 账号/CSRF、CI 远端运行。

## 下一步

1. 用户验收 4.2。
2. 对象存储适配接口（本地 + 可配置 S3 兼容端点）。
3. 有凭据后接 SMTP/PWA 投递。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
