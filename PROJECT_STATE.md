# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：4 — 智能日程与自动化（进行中）
- 当前里程碑：4.1 自动化规则引擎、运行记录与通知中心 — 完成
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 74 通过（contracts 10、api 64）；Playwright 12 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），25 张表，迁移 0000–0010
- 部署状态：未部署
- 最近 commit：`28489ee`

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
| `pnpm test` | 74 passed（contracts 10、api 64） |
| `pnpm test:e2e` | 12 passed |

## 已实现

- 阶段 1–3：学习平台、题库/考试/复习、RAG/PDF、AI 记忆、分析/风险、导师、多 Agent、学习计划、记忆提取。
- 4.1：
  - **自动化规则**：trigger（task.completed / focus.completed / exam.submitted）+ conditions + actions（create_notification / create_task）；规则 CRUD、启停、dry-run；
  - **运行记录**：`automation_runs`，成功/失败留痕；
  - **通知中心**：`notifications`，站内通知列表、未读数、标为已读、`dispatch` 发送到期站内通知（email/pwa 暂未接投递）；
  - **事件钩子**：任务首次变为 done 时触发 `task.completed` 自动化，失败不影响用户写入；
  - Web：「自动化与通知」面板（规则增删启停、最近运行、通知列表/发送/已读）。

## 未完成项（阶段 4 剩余）

- 邮件 / PWA 推送的真实投递（需 SMTP/推送服务与凭据）。
- 定时调度 worker（当前 dispatch 需手动/外部触发）。
- 自然语言生成规则（AI 草案）与审批流。
- 高级日历/通知调度（重复事件、勿扰、摘要）。
- 跨阶段：冲突合并 UI、账号/CSRF、对象存储、CI 远端运行。

## 下一步

1. 验收 4.1。
2. 继续 4.2：调度 worker + 多渠道投递（需用户提供 SMTP/推送凭据）。
3. 或先补跨阶段项。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
