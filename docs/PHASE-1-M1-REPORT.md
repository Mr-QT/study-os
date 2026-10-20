# 里程碑 1.1 报告：访客身份、学习空间与持久化基础

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现功能（附文件路径）

- 数据层：`packages/db/src/schema.ts`（users / spaces / memberships）、`packages/db/migrations/0000_brief_prism.sql`、`packages/db/src/index.ts`
- 契约：`packages/contracts/src/index.ts`（用户、空间、创建/更新输入、扁平错误 envelope）
- 访客会话：`apps/api/src/auth/session.ts`、`apps/api/src/auth/require-user.ts`、`apps/api/src/routes/auth.ts`
- 空间 API：`apps/api/src/routes/spaces.ts`（列表/创建/读取/更新，成员权限，404 防 IDOR）
- 数据库句柄与健康检查：`apps/api/src/db.ts`、`apps/api/src/dto.ts`、`apps/api/src/http/errors.ts`
- Web 工作台：`apps/web/components/workspace-home.tsx`、`apps/web/app/[lang]/page.tsx`
- 本地缓存：`apps/web/lib/local-db.ts`（Dexie `study-os.spaces`）
- 测试：`apps/api/test/spaces.integration.test.ts`、`apps/api/test/database.integration.test.ts`、`tests/e2e/smoke.spec.ts`

## 部分实现/未实现

- 未实现：账号体系、设备撤销、CSRF token、空间层级外键与环检测。
- 离线写入与同步 outbox 属 1.5，本期只有只读缓存。
- 课程、任务、日历、笔记等属后续里程碑。

## 启动方式

```powershell
pnpm install
$env:DATABASE_URL="postgres://studyos@127.0.0.1:55432/studyos"
pnpm db:migrate
pnpm dev
```

## 测试命令与实际结果

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过 |
| `pnpm typecheck` | contracts / db / api / web 通过 |
| `pnpm test`（带数据库） | 29 passed（contracts 10、api 19） |
| `pnpm test:e2e`（带数据库） | 8 passed（含创建空间、刷新持久化、IndexedDB 断言、axe） |
| `pnpm build` | API 与 Web 构建成功 |

## 真实业务流程验收

1. 打开 `/zh-CN` → 自动创建访客身份（Cookie）。
2. 默认获得「我的学习空间」，可创建新空间。
3. 刷新后空间仍在（服务端持久化），IndexedDB 中可读到缓存副本。
4. 第二个访客无法读取或修改第一个访客的空间（返回 404）。

## 截图

`docs/screenshots/zh-CN-home.png`、`en-home.png`、`phone-home.png`、`tablet-home.png`、`workspace-with-space.png`

## 安全、隐私、同步、费用风险

- 会话 Cookie：httpOnly、SameSite=Lax、生产 Secure；生产强制 `SESSION_SECRET`。
- 无 CSRF token（依赖 SameSite），列入已知问题。
- 无外部 AI 调用、无费用产生；未处理真实用户数据。

## 数据库迁移及恢复

- 迁移可重复执行（drizzle 迁移记录表）；回滚需手写 down SQL，尚未实现自动回滚。
- 备份/恢复策略属运维阶段。

## 已知问题

见 `KNOWN_ISSUES.md`。重点：WSL2 未真正重启、Docker Compose 未验证、账号/CSRF 未实现。

## 文档更新

`README.md`、`PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`KNOWN_ISSUES.md`、`docs/adr/0007–0009`、ADR 索引。

## 需要用户确认的决策

1. ADR-0007 Drizzle ORM 是否批准。
2. ADR-0008 访客签名 Cookie 会话是否批准（后续是否尽快引入账号）。
3. ADR-0009 IndexedDB 缓存范围是否批准（离线写入放 1.5）。
4. 是否继续里程碑 1.2（课程/学期、任务、基础日历）。

## 用户验收结果

待确认。建议：通过（Compose 验证作为遗留项，与 1.1 功能无关）。
