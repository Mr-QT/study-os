# 阶段 4.3 报告：重复事件、提醒、免打扰与每日摘要

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-21

## 实现

### 日历
- `calendar_events` 新增 `recurrence`（none/daily/weekly）、`recurrence_until`、`reminder_minutes`、`created_by`
- `POST/PATCH/DELETE /api/v1/calendar/events` 支持重复与提醒；更新/删除时清理并重排待发提醒
- `GET /api/v1/calendar/occurrences?spaceId&from&to`：按时间范围展开重复事件（每天/每周，最多 500 条）
- Web：事件表单增加重复与提前提醒；列表显示重复标记

### 通知偏好与摘要
- `notification_preferences`：时区、免打扰起止小时、摘要小时、摘要开关
- `GET/PATCH /api/v1/notifications/preferences`
- `POST /api/v1/notifications/digest`：汇总未来 24 小时日程、待办/逾期、未读通知，按本地日期去重
- 免打扰：`nextAllowedTime` 按小时顺延到窗口外（保留分钟）
- worker 每轮检查摘要候选（本地小时 = digestHour 且启用），生成后去重

## 测试

- `test/calendar-advanced.test.ts`：展开、静默时段、本地日期键（5 个）
- `test/calendar-advanced.integration.test.ts`：重复事件、提醒重排、删除清理、偏好、摘要去重（5 个）
- `pnpm test`：92 passed（contracts 10、api 82）
- `pnpm test:e2e`：13 passed
- `pnpm lint` / `typecheck` / `build`：通过

## 未完成

- 邮件/PWA 投递（BLOCKED：需要凭据）
- 重复日程例外/调休、字段级冲突合并、账号/CSRF、CI 远端运行
- 摘要模板与内容偏好（当前固定摘要）
