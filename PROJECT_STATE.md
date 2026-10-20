# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：1 — 完整基础平台与核心学习闭环
- 当前里程碑：1.4 完成（AI 网关，默认关闭）；1.5 部分完成（同步 pull/push 与统计；客户端 outbox 未做）
- 已通过用户验收：阶段 0 未正式记录；用户已指示继续阶段 1
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 49 通过（contracts 10、api 39）；Playwright 10 通过
- 部署状态：未部署
- 数据库：PostgreSQL 16.14（便携实例，端口 55432），12 张表，迁移 0000–0004 已应用
- 已确认技术基线：见 `docs/adr/`（全部为 Proposed，待批准）
- 最近 commit：提交后更新

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js | 24.22.0（`D:\nodejs`） |
| pnpm | 10.34.7（用户级前缀） |
| Git | 2.55.0（`D:\Git`） |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16.14（便携实例，端口 55432） |
| Playwright | 1.64.1 |
| Docker Desktop | 4.95.0（已安装，WSL2 仍待真正重启） |

## 已验证命令与结果（2026-10-20）

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过 |
| `pnpm typecheck` | contracts / db / api / web 通过 |
| `pnpm db:migrate` | 0000–0004 迁移成功 |
| `pnpm test`（带 `DATABASE_URL`） | 49 passed（contracts 10、api 39） |
| `pnpm test:e2e`（带数据库） | 10 passed |
| `pnpm build` | API 打包与 Web 构建成功 |

## 已实现

- 1.1–1.3：访客、空间、课程、任务、日历、笔记、专注、学习日志、文件。
- 1.4（AI 基础）：
  - 网关默认关闭；支持 OpenAI 兼容与 Ollama 适配器；
  - 私密空间仅允许本地模型（403 PRIVACY_DENIED）；
  - 月度预算硬上限（402 BUDGET_EXCEEDED）；成功/失败调用写入 `ai_invocations`；
  - `/api/v1/ai/status`、`/api/v1/ai/usage`、`/api/v1/ai/requests`；
  - Web AI 面板：未配置时明确提示；配置后可生成学习建议并显示预算。
- 1.5（部分）：
  - `sync_changes` 变更日志；任务/笔记的创建、更新、删除都会记录；
  - `GET /api/v1/sync/pull` 游标增量拉取；`POST /api/v1/sync/push` 批量应用任务/笔记补丁并返回 accepted/conflict/rejected；
  - `/api/v1/stats` 空间统计；Web 统计面板。

## 未完成项

- **客户端 outbox、离线编辑队列、自动重放、冲突合并 UI 未实现**（1.5 的核心剩余部分）。
- AI 未配置真实密钥，未对真实提供方做受控 smoke test；仅用 stub 验证逻辑。
- 自动化、插件、复习/考试、AI 记忆等后续阶段未开始。
- 账号体系、设备撤销、CSRF token 未实现。
- Docker Compose 仍未运行（WSL2 未真正重启）。
- CI 尚未在 GitHub Actions 远端运行。

## 下一步

1. 用户验收 1.4 与 1.5 的已完成部分（`docs/PHASE-1-M45-REPORT.md`）。
2. 完成 1.5 剩余：Dexie outbox、离线重放、冲突 UI。
3. 配置真实 AI 提供方前先确认密钥与预算策略。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
