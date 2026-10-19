# PROJECT_STATE — 真实项目状态

- 日期：2026-10-19
- 当前阶段：0 — 架构验证与工程初始化（进行中，未验收）
- 当前里程碑：0.1–0.2 完成，0.3（数据库）部分完成，0.4 进行中
- 已通过用户验收：无
- 应用代码：已生成工程骨架 `apps/web`、`apps/api`、`packages/contracts`；无业务功能
- 测试结果：单元/契约 10 通过；Playwright smoke 4 通过；lint/typecheck/build 通过
- 部署状态：未部署
- 数据库：**未验证**（本机无 Docker Desktop / WSL2，见 `KNOWN_ISSUES.md`）
- 已确认技术基线：见 `docs/adr/`（全部为 Proposed，待批准）

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

## 已验证命令与结果（2026-10-19）

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过，0 错误 |
| `pnpm typecheck` | contracts / api / web 全部通过 |
| `pnpm test` | 10 passed（contracts 5、api 5） |
| `pnpm build` | API tsup 成功；Web `next build` 成功，`/zh-CN`、`/en` 预渲染 |
| `pnpm test:e2e` | 4 passed；截图 `test-results/zh-CN-home.png`、`test-results/en-home.png` |

## 未完成项

- Docker Desktop / WSL2 未安装，`infra/docker/docker-compose.yml` 尚未运行验证。
- 数据库 schema、迁移工具、ORM（ADR-0004）未选型、未验证。
- CI 仅本地通过，尚未在 GitHub Actions 远端运行。
- 无障碍仅基础实现，未做 axe/WCAG 2.2 AA 审计。

## 下一步

1. 安装 Docker Desktop + WSL2（需要一次重启）。
2. 启动 PostgreSQL，验证连接、迁移与 `/ready` 的真实 `ok` 状态。
3. 完成后提交阶段 0 验收，等待用户批准；**不进入阶段 1**。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
