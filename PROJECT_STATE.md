# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：1 — 完整基础平台与核心学习闭环
- 当前里程碑：1.1（访客身份、空间、schema、契约、权限、IndexedDB）— 完成，等待验收
- 已通过用户验收：阶段 0 未正式记录；用户已指示进入阶段 1
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`；已实现访客会话与学习空间
- 测试结果：单元/集成 29 通过（contracts 10、api 19，含真实数据库）；Playwright 8 通过
- 部署状态：未部署
- 数据库：PostgreSQL 16.14（便携实例）已应用迁移并跑通集成测试；Docker Compose 仍待重启验证
- 已确认技术基线：见 `docs/adr/`（全部为 Proposed，待批准）
- 最近 commit：本次提交后更新

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
| Docker Desktop | 4.95.0（已安装，WSL2 待真正重启） |

## 已验证命令与结果（2026-10-20）

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过，0 错误 |
| `pnpm typecheck` | contracts / db / api / web 全部通过 |
| `pnpm db:migrate` | 迁移成功，生成 `users`、`spaces`、`memberships` |
| `pnpm test`（带 `DATABASE_URL`） | 29 passed（contracts 10、api 19） |
| `pnpm test:e2e`（带数据库） | 8 passed（含创建空间、刷新后仍在、IndexedDB 断言、axe） |
| `pnpm build` | API 打包与 Web 预渲染成功 |

## 已实现（里程碑 1.1）

- 访客会话：`POST /api/v1/auth/guest` 事务创建用户 + 默认空间 + 所有者成员关系；签名 Cookie 会话
- 空间 API：列表、创建、读取、更新；非成员统一 404（IDOR 测试覆盖）
- 数据层：Drizzle schema + SQL 迁移；连接池与 1.5s 健康检查超时
- 契约：用户、空间、创建/更新输入、统一错误结构（`code/message/correlationId/retryable`）
- Web：学习空间工作台（创建、列表、隐私标签、离线缓存提示）；Modern Calm 配色；中英双语
- 本地缓存：Dexie 的 `study-os.spaces` 表，成功后写入；API 不可用时展示缓存并明确标注
- CI：quality 与 e2e job 均带 PostgreSQL service，测试前执行迁移

## 未完成项

- Docker Compose 编排仍未运行（需要一次真正的重启以启用 WSL2）。
- 账号体系、设备撤销、CSRF token 尚未实现。
- 离线写入与 outbox、冲突处理属里程碑 1.5。
- 空间层级（`parentId`）已存字段但未加自引用外键与环检测。
- CI 尚未在 GitHub Actions 远端运行。
- 无障碍：axe WCAG 2.0/2.1 A/AA 无违规；未做读屏/键盘人工走查。

## 下一步

1. 用户验收里程碑 1.1（`docs/PHASE-1-M1-REPORT.md`）。
2. 进入 1.2：课程/学期与任务 CRUD、引用关系、基础日历事件。
3. 真正的重启后补做 `pnpm verify:db`（Docker Compose）。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
