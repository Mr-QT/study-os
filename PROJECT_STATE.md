# PROJECT_STATE — 真实项目状态

- 日期：2026-10-19
- 当前阶段：0 — 交付完成，等待用户验收（Docker Compose 运行验证待重启）
- 当前里程碑：阶段 0.1–0.4 完成
- 已通过用户验收：无
- 应用代码：已生成工程骨架 `apps/web`、`apps/api`、`packages/contracts`；无业务功能
- 测试结果：单元 16 通过（contracts 5、api 11）；数据库集成 2 通过（提供 `DATABASE_URL` 时运行）；Playwright 7 通过（含 axe WCAG A/AA 与手机/平板视口）；lint/typecheck/build 通过
- 部署状态：未部署
- 数据库：**连接与就绪已验证**（便携版 PostgreSQL 16.14，临时实例，已清理）；Docker Compose 编排仍待重启验证
- 已确认技术基线：见 `docs/adr/`（全部为 Proposed，待批准）
- 最近 commit：待本次提交后更新

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js | 24.22.0（`D:\nodejs`，需在 PATH） |
| pnpm | 10.34.7（用户级前缀 `%LOCALAPPDATA%\npm-global`） |
| Git | 2.55.0（`D:\Git`） |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod | 5.12.7 / 4.6.7 |
| Playwright | 1.64.1（Chromium headless shell） |
| Docker Desktop | 4.95.0（已安装，WSL2 功能待重启生效） |

## 已验证命令与结果（2026-10-19）

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过，0 错误 |
| `pnpm typecheck` | contracts / api / web 全部通过 |
| `pnpm test` | 10 passed（contracts 5、api 5） |
| `pnpm build` | API tsup 成功；Web `next build` 成功，`/zh-CN`、`/en` 预渲染 |
| `pnpm test:e2e` | 7 passed（smoke 4 + axe 2 + 双视口 1）；截图 `docs/screenshots/` |
| `pnpm test` | 16 passed（contracts 5、api 11；2 个 DB 集成用例在无 DATABASE_URL 时跳过） |
| 生产产物启动（`node apps/api/dist/index.js` + `next start`） | `/health`、`/zh-CN`、`/en` 均 200，停止后端口释放 |

## 未完成项

- Docker Desktop / WSL2：功能已启用，但**系统需要重启**后 `docker` 引擎才可用；`infra/docker/docker-compose.yml` 尚未实际运行。
- 数据库 schema、迁移工具、ORM（ADR-0004）未选型、未验证。
- CI 仅本地通过，尚未在 GitHub Actions 远端运行。
- 无障碍：axe 自动扫描 WCAG 2.0/2.1 A/AA 无违规；未做读屏/键盘人工走查。

## 下一步

1. 重启 Windows（启用 WSL2）。
2. 启动 Docker Desktop，执行 `pnpm db:up`，验证 Compose 编排与 `DATABASE_URL` 连接（代码路径已用便携版 PostgreSQL 验证）。
3. 选定 ORM 并建立首个迁移，跑集成测试。
4. 完成后提交阶段 0 验收，等待用户批准；**不进入阶段 1**。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
