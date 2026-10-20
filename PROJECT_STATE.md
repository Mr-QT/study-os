# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：1 — 完整基础平台与核心学习闭环
- 当前里程碑：1.2（课程/学期、任务 CRUD、引用、基础日历）— 完成，等待验收
- 已通过用户验收：阶段 0 未正式记录；用户已指示继续阶段 1
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 36 通过（contracts 10、api 26）；Playwright 9 通过
- 部署状态：未部署
- 数据库：PostgreSQL 16.14（便携实例，端口 55432），7 张表，迁移 0000/0001 已应用
- 已确认技术基线：见 `docs/adr/`（全部为 Proposed，待批准）
- 最近 commit：`7e98cd3`

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
| `pnpm lint` | 通过，0 错误 |
| `pnpm typecheck` | contracts / db / api / web 全部通过 |
| `pnpm db:migrate` | 0000、0001 迁移成功 |
| `pnpm test`（带 `DATABASE_URL`） | 36 passed（contracts 10、api 26） |
| `pnpm test:e2e`（带数据库） | 9 passed（空间、课程、任务、事件、持久化、axe） |
| `pnpm build` | API 打包与 Web 构建成功 |

## 已实现

### 里程碑 1.1
- 访客会话、学习空间、成员权限、Drizzle 迁移、统一错误、IndexedDB 只读缓存。

### 里程碑 1.2
- 学期（terms）：创建与列表，日期区间校验。
- 课程（courses）：创建、列表、更新、软删除；学期归属校验。
- 任务（tasks）：创建、列表（按状态过滤）、读取、更新、软删除；课程引用校验；`version` 乐观并发，冲突返回 409。
- 日历事件（calendar_events）：创建与按空间/时间范围列表；开始/结束时间校验。
- Web：空间详情页 `/zh-CN/spaces/[id]`，可添加课程、任务、事件，任务可完成/恢复；失败与冲突状态可见。
- 权限：所有空间级接口先校验成员关系；非成员统一 404（覆盖课程、任务、事件、学期）。

## 未完成项

- 笔记、文件、专注、AI、同步与离线写入均未实现（1.3–1.5）。
- 账号体系、设备撤销、CSRF token 未实现。
- 空间层级 `parentId` 无自引用外键与环检测。
- Docker Compose 编排仍未运行（WSL2 未真正重启）。
- CI 尚未在 GitHub Actions 远端运行。
- 无障碍：axe 自动扫描无违规；未做读屏/键盘人工走查。

## 下一步

1. 用户验收里程碑 1.2（`docs/PHASE-1-M2-REPORT.md`）。
2. 进入 1.3：Markdown 笔记、文件上传、专注会话与学习日志。
3. 真正重启后补做 `pnpm verify:db`。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
