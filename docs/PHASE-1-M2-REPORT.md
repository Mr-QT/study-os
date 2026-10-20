# 里程碑 1.2 报告：课程、任务与基础日历

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现功能（附文件路径）

- 数据层：`packages/db/src/schema.ts` 新增 `terms`、`courses`、`tasks`、`calendar_events`；迁移 `packages/db/migrations/0001_messy_hardball.sql`
- 契约：`packages/contracts/src/index.ts`（学期/课程/任务/事件 DTO 与输入、查询 schema）
- API：
  - `apps/api/src/routes/courses.ts`：`/api/v1/terms` 列表与创建；`/api/v1/courses` 列表、创建、更新、软删除
  - `apps/api/src/routes/tasks.ts`：任务列表（按状态过滤）、创建、读取、更新（版本冲突 409）、软删除
  - `apps/api/src/routes/calendar.ts`：事件创建与按空间/时间范围列表
  - `apps/api/src/auth/space-access.ts`：空间成员权限与写权限
- Web：`apps/web/app/[lang]/spaces/[id]/page.tsx`、`apps/web/components/space-workspace.tsx`
- 首页入口：空间卡片链接到详情页（`apps/web/components/workspace-home.tsx`）
- 测试：`apps/api/test/learning.integration.test.ts`、`tests/e2e/smoke.spec.ts`

## 部分实现/未实现

- 学期只有创建与列表，没有更新/删除。
- 日历事件只有创建与列表；任务截止时间尚未自动投影为日历事件。
- 子任务/依赖、看板视图、甘特视图未实现。
- 冲突只做刷新提示，没有合并界面。
- 笔记、文件、专注、AI、同步均未开始。

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
| `pnpm test`（带数据库） | 36 passed（contracts 10、api 26） |
| `pnpm test:e2e`（带数据库） | 9 passed（含课程/任务/事件创建、任务完成、持久化、axe） |
| `pnpm build` | API 与 Web 构建成功 |

## 真实业务流程验收

1. 首页创建空间 → 点击卡片进入空间详情。
2. 添加课程「高等数学」→ 出现在课程列表。
3. 添加任务并可选关联课程 → 点击「完成」→ 状态变为已完成，按钮变为「恢复」。
4. 添加日历事件（开始/结束时间）→ 出现在事件列表。
5. 另一个访客访问同一空间 URL → 页面显示无权访问（API 返回 404）。

## 截图

`docs/screenshots/space-detail.png`，以及更新后的 `zh-CN-home.png`、`en-home.png`、`phone-home.png`、`tablet-home.png`、`workspace-with-space.png`。

## 安全、隐私、同步、费用风险

- 所有空间级接口先校验成员关系；非成员统一 404，避免资源存在性泄露。
- 任务更新使用 `version` 乐观并发（ADR-0010），禁止静默覆盖。
- CORS 方法白名单包含 PATCH/DELETE；仅允许配置的来源。
- 无外部 AI 调用与费用；未处理真实用户数据。

## 数据库迁移及恢复

- 迁移 0001 已在 PostgreSQL 16.14 上应用；drizzle 迁移记录表可重复执行。
- 自动回滚仍未实现；删除均为软删除，可通过数据库恢复。

## 已知问题

见 `KNOWN_ISSUES.md`。重点：WSL2 未真正重启、Docker 编排未验证、账号/CSRF 未实现、学期/事件接口不完整。

## 文档更新

`README.md`、`PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`KNOWN_ISSUES.md`、`docs/adr/0010`、ADR 索引。

## 需要用户确认的决策

1. ADR-0010 乐观并发方案是否批准。
2. 里程碑 1.2 是否验收通过（建议：通过）。
3. 是否继续里程碑 1.3（笔记、文件、专注、学习日志）。
4. 是否安排一次真正的重启以完成 Docker Compose 验证。

## 用户验收结果

待确认。
