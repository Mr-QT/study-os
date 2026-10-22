# 阶段 6.2 报告：任务分配与 JSON 迁移

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-22

## 任务分配
- `tasks.assignee_id`（迁移 0016，FK users，删除时置空）
- 创建/更新任务支持 `assigneeId`；必须是空间成员，否则 400；可置 null 取消
- viewer 仍不能写；协作面板新增「任务分配」：选择任务/成员、分配、显示当前负责人

## 迁移扩展
- 迁移中心自动识别内容：CSV（表头）或 JSON（数组 / `{items: []}` / `{rows: []}`）
- JSON 行复用同一校验（title/status/dueAt 或 prompt/answer），预览、提交、回滚、原件 SHA-256 不变
- 测试：JSON 预览 + 提交创建任务

## 验证
- `pnpm test`：121 passed（contracts 10、api 111）
- `pnpm test:e2e`：16 passed
- `pnpm lint` / `typecheck` / `build`：通过

## 未完成
- 插件 SDK / Webhook / 第三方连接器
- 批量分配、分配通知、@ 提醒
