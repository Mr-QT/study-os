# 阶段 5.1 报告：目标、习惯、成就与成长档案

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-21

## 实现

### 数据
- `learning_goals`：指标（focus_minutes / tasks_done / questions_answered / exams_completed）、目标值、区间、状态
- `habits`：标题、频率（daily/weekly）、每周期目标、启用
- `habit_checkins`：按 (habit_id, checkin_date) 唯一，同日多次打卡累加

### API
- `GET/POST /api/v1/goals`、`PATCH/DELETE /api/v1/goals/:id`，进度按区间实时聚合
- `GET/POST /api/v1/habits`、`PATCH /api/v1/habits/:id`
- `POST /api/v1/habits/:id/checkins`：同日 upsert 递增
- `GET /api/v1/profile/summary`：总计、目标、习惯、成就
- `GET /api/v1/profile/export`：Markdown 成长档案，含生成时间、空间与数据来源；不含原始笔记/题目

### Web
- 空间页新增「目标、习惯与成长档案」面板：创建目标与进度条、习惯打卡、成就徽章、导出 Markdown

## 测试

- `test/growth.integration.test.ts`（5 个）：目标进度、习惯同日打卡与连续天数、档案/成就/导出、跨用户隔离、习惯列表
- `pnpm test`：97 passed（contracts 10、api 87）
- `pnpm test:e2e`：14 passed（新增目标创建/习惯打卡）
- `pnpm lint` / `typecheck` / `build`：通过

## 未完成

- 多模态：录音转写、OCR、手写适配
- 迁移中心（CSV/Anki/Notion 导入、预览与回滚）
- 作品集页面（当前只导出 Markdown）
- 目标提醒/自动复盘、成就通知
