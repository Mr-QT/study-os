# 里程碑 1.3 报告：笔记、专注、学习日志与文件

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现功能（附文件路径）

- 数据层：`packages/db/src/schema.ts` 新增 `notes`、`focus_sessions`、`file_assets`；迁移 `0002_free_karma.sql`、`0003_daily_shinko_yamashiro.sql`
- 契约：`packages/contracts/src/index.ts`（笔记、专注、文件、学习日志 DTO 与输入）
- API：
  - `apps/api/src/routes/notes.ts`：笔记创建/列表/读取/更新/软删除，版本冲突 409
  - `apps/api/src/routes/focus.ts`：开始/结束专注，同一用户同空间仅一个未结束会话
  - `apps/api/src/routes/learning-log.ts`：按日聚合已完成会话的分钟数
  - `apps/api/src/routes/files.ts`：multipart 上传、列表、鉴权下载、软删除
  - `apps/api/src/config.ts` 新增 `storageDir`
- Web：
  - `apps/web/components/notes-panel.tsx`（react-markdown 渲染）
  - `apps/web/components/focus-panel.tsx`（计时器、最近会话、学习日志）
  - `apps/web/components/files-panel.tsx`（上传、下载、删除）
  - `apps/web/components/space-workspace.tsx` 集成三个面板
- 测试：`apps/api/test/content.integration.test.ts`、`tests/e2e/study-tools.spec.ts`

## 部分实现/未实现

- 笔记无编辑 UI、无搜索/双链；专注无暂停与任务选择 UI。
- 文件仅本地磁盘、无病毒扫描/配额/版本。
- 学习日志按 UTC 日期切分，未按用户时区。
- AI、同步、离线写入未开始。

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
| `pnpm test`（带数据库） | 42 passed（contracts 10、api 32） |
| `pnpm test:e2e`（带数据库） | 10 passed（含笔记渲染、专注计时、文件上传、课程/任务/事件、axe） |
| `pnpm build` | API 与 Web 构建成功 |

## 真实业务流程验收

1. 进入空间 → 新建 Markdown 笔记 → 页面渲染标题与列表内容。
2. 点击「开始专注」→ 计时常驻 → 点击「结束专注」→ 出现最近会话；学习日志出现当日汇总。
3. 选择文件 → 上传 → 列表显示文件名与大小 → 可下载、可删除。
4. 另一个访客访问同一空间的笔记或文件 → 返回 404。

## 截图

`docs/screenshots/space-tools.png`（空间工具面板）、`space-detail.png`（课程/任务/日历）。

## 安全、隐私、同步、费用风险

- 上传限制 10MB 与 MIME 白名单；随机磁盘名防路径穿越；下载前校验空间成员。
- 文件按空间隔离；软删除保留磁盘文件。
- 笔记 Markdown 由 react-markdown 渲染，默认不执行原始 HTML。
- 无外部 AI 调用与费用。

## 数据库迁移及恢复

- 迁移 0002/0003 已应用；`focus_sessions.user_id` 为后续协作预留。
- 自动回滚未实现；删除为软删除。

## 已知问题

见 `KNOWN_ISSUES.md`。重点：WSL2 未真正重启、Docker 编排未验证、笔记无编辑 UI、文件仅本地磁盘、CSRF 未实现。

## 文档更新

`README.md`、`PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`KNOWN_ISSUES.md`、`docs/adr/0011`、ADR 索引。

## 需要用户确认的决策

1. ADR-0011 本地文件存储方案是否批准。
2. 里程碑 1.3 是否验收通过（建议：通过）。
3. 下一步优先级：1.4 AI 基础（需要模型提供方、密钥与预算策略）或 1.5 同步。
4. 是否安排真正的重启以完成 Docker Compose 验证。

## 用户验收结果

待确认。
