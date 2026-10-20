# 阶段 4.1 报告：自动化规则、运行记录与通知中心

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现

### 数据
- `automation_rules`：trigger、conditions(JSON)、actions(JSON)、enabled
- `automation_runs`：rule_id、trigger、status(ok/error/skipped)、message
- `notifications`：channel(in_app/email/pwa)、status(pending/sent/failed/read)、scheduled_at、read_at、dedupe_key

### API
- `GET/POST /api/v1/automation/rules`、`PATCH/DELETE /:id`
- `POST /api/v1/automation/rules/:id/dry-run`：条件匹配与动作预览
- `GET /api/v1/automation/runs`
- `GET /api/v1/notifications`（未读数）、`PATCH /:id/read`、`POST /api/v1/notifications/dispatch`
- 事件钩子：任务首次变为 done 时执行 `task.completed` 规则；自动化异常不影响任务写入

### 引擎
- `apps/api/src/automation/engine.ts`：条件全等匹配、动作执行、运行留痕
- 动作：`create_notification`（站内）、`create_task`（按 dueInDays 创建任务）

### Web
- `apps/web/components/automation-panel.tsx`：规则增删启停、最近运行、通知列表/发送/已读

## 测试

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 74 passed（contracts 10、api 64） |
| `pnpm test:e2e` | 12 passed |

新增 `apps/api/test/automation.integration.test.ts`（5 个）：规则创建、dry-run、完成任务触发通知、dispatch/已读、跨用户隔离。

## 未完成（阶段 4 剩余）

- 邮件/PWA 真实投递（需 SMTP/推送凭据）
- 后台调度 worker
- 自然语言规则生成与审批
- 高级日历/通知（重复、勿扰、摘要）

## 需要用户确认

1. 4.1 是否验收。
2. 是否继续 4.2（worker + 邮件/PWA），若继续需要 SMTP/推送配置。

## 用户验收结果

待确认。
