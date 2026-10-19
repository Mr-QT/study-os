# 阶段 0 里程碑报告（草稿，待数据库验证）

- 当前 commit：`6951838`（另有 `9dfc8e7`、`c4d1d2d`）
- 日期：2026-10-19
- 实现功能（附文件路径）：
  - pnpm workspace 与根配置：`package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`eslint.config.mjs`、`.prettierrc.json`
  - 共享契约：`packages/contracts/src/index.ts`（健康检查、就绪、错误 envelope 的 Zod schema）
  - API：`apps/api/src/{app,config,db,index}.ts`、`apps/api/src/routes/health.ts`（Fastify 5，`/health`、`/ready`、统一错误、CORS、日志脱敏）
  - Web：`apps/web/app/[lang]/{layout,page}.tsx`、`apps/web/components/{system-status,locale-switcher}.tsx`、`apps/web/lib/{i18n,api}.ts`（Next 16，中英双语，真实状态页）
  - 测试：`packages/contracts/src/index.test.ts`、`apps/api/test/health.test.ts`、`tests/e2e/smoke.spec.ts`
  - CI：`.github/workflows/ci.yml`
  - 容器：`infra/docker/docker-compose.yml`（PostgreSQL 16，未运行验证）
  - ADR：`docs/adr/0001–0006`（均为 Proposed）

- 部分实现/未实现：
  - 数据库 schema、迁移、ORM 未选型（ADR-0004）；PostgreSQL 容器未启动。
  - CI 未在 GitHub Actions 远端运行。
  - 无障碍未做 axe / WCAG 2.2 AA 审计。
  - 所有业务功能（空间、课程、任务、日历、笔记、AI、同步）均为 `PLANNED`。

- 启动方式：

  ```powershell
  pnpm install
  pnpm dev
  ```

  Web：http://127.0.0.1:3000（`/zh-CN`、`/en`）；API：http://127.0.0.1:4000/health

- 测试命令与实际结果：
  - `pnpm lint` → 0 错误
  - `pnpm typecheck` → contracts / api / web 全部通过
  - `pnpm test` → 10 passed（contracts 5、api 5）
  - `pnpm build` → API tsup 成功；Web 预渲染 `/zh-CN`、`/en`
  - `pnpm test:e2e` → 7 passed（smoke 4、axe 无障碍 2、手机/平板视口 1）
  - `pnpm dev` 手工验证 → `/health` 200、`/zh-CN` 200，停止后端口释放
  - `.env` 自动加载验证 → 临时设置 `API_PORT=4011` 后 API 仅在 4011 监听

- 真实业务流程验收：仅验证“Web 读取 API 真实健康状态”这一条链路；无业务数据流。

- 截图：`docs/screenshots/zh-CN-home.png`、`en-home.png`（桌面 1280×840）、`phone-home.png`（390×844）、`tablet-home.png`（820×1180）

- 安全、隐私、同步、费用风险：无真实数据、无外部 AI 调用、无密钥；日志已脱敏 `authorization`/`cookie`；开发服务器已限定 `127.0.0.1`。

- 数据库迁移及恢复：未实现。

- 已知问题：
  - WSL2 功能已启用但**需要重启**才生效；`com.docker.service` 未启动，`docker compose` 尚未运行。
  - Docker Desktop 4.95.0 已安装。
  - 其余见 `KNOWN_ISSUES.md`。

- 文档更新：`README.md`、`PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`KNOWN_ISSUES.md`、`docs/adr/*`

- 需要用户确认的决策：
  1. ADR-0001（pnpm monorepo）是否批准。
  2. ADR-0002（Node 24 / Next 16 / React 19 基线）是否批准。
  3. ADR-0003（Fastify 5）是否批准。
  4. ADR-0004 数据库与 ORM：是否按“PostgreSQL 16 + 待 spike 选定 ORM”推进。
  5. 是否允许重启以启用 WSL2，从而完成 PostgreSQL 与 Compose 验证。
  6. 阶段 0 验收：通过 / 有条件通过 / 不通过。

- 用户验收结果：待确认（数据库尚未验证，建议“有条件通过”前先完成重启与 DB 验证）
