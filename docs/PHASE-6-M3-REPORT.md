# 阶段 6.3 / 7.2 报告：出站 Webhook 与系统状态

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-22

## Webhook
- 数据：`webhook_endpoints`、`webhook_deliveries`（迁移 0017）
- API：
  - `GET/POST /api/v1/spaces/:id/webhooks`、`PATCH/DELETE /api/v1/webhooks/:id`
  - `POST /api/v1/webhooks/:id/test`（同步投递）
  - `GET /api/v1/webhooks/:id/deliveries`
- 事件：task.completed / focus.completed / exam.submitted / comment.created / ping
- 签名：`x-studyos-signature: v1=HMAC-SHA256(secret, timestamp.body)`，附带 event、delivery、timestamp 头
- 投递：5 秒超时，失败后最多 3 次、1/2 分钟退避；worker 每 30 秒处理到期投递
- Web：空间页「Webhook（出站）」面板：创建、事件勾选、密钥一次性展示、测试、投递记录、启停、删除

## 系统状态（7.2）
- `GET /api/v1/system/status`：版本、Node、uptime、数据库状态、已应用迁移数、最近备份（名称/大小/时间）
- 首页「系统状态」面板；备份超过 7 天给出提醒

## 测试
- `test/webhooks.integration.test.ts`：本地 HTTP 服务验证签名、测试投递、任务完成入队 + worker 投递、失败保持 pending
- `test/system.test.ts`：状态字段与迁移数、最近备份
- `pnpm test`：125 passed（contracts 10、api 115）
- `pnpm test:e2e`：16 passed
- `pnpm lint` / `typecheck` / `build`：通过

## 未完成
- 插件 SDK / 入站 Webhook / 第三方连接器
- Webhook 事件过滤、手动重放、投递记录清理
- 发布渠道、性能优化、自动恢复演练
