# 里程碑 2.1 报告：题库、错题与间隔复习

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现功能

- 数据层：`questions`、`question_attempts`、`review_items`（迁移 `0005_warm_tusk.sql`）
- 契约：题目 DTO、创建输入、作答结果、复习队列（`packages/contracts`）
- API（`apps/api/src/routes/questions.ts`）：
  - `GET/POST /api/v1/questions`、`DELETE /api/v1/questions/:id`
  - `POST /api/v1/questions/:id/attempts`：归一化判分、写入 attempt、更新复习计划
  - `GET /api/v1/review/queue`：到期待复习题目
  - `GET /api/v1/questions/wrong`：最近一次答错的题目
- 复习算法：简化 SM-2。答对：1 天 → 3 天 → 间隔×ease；答错：重置 1 天并降低 ease。
- Web：`apps/web/components/questions-panel.tsx`，集成到空间详情页。

## 测试结果

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 54 passed（contracts 10、api 44） |
| `pnpm test:e2e` | 11 passed（含题库创建） |
| `pnpm verify:db` | 容器 healthy、迁移成功、39 个 API 测试通过 |

新增测试 `apps/api/test/questions.integration.test.ts`：创建/列表、错题判定、到期队列（直接改 dueAt 验证）、答对后顺延、跨用户 404。

## 未实现

- 考试、成绩/GPA、错题统计图表。
- RAG 检索与 PDF 注释。
- 题库编辑 UI、批量导入、单选选项编辑。
- 冲突合并 UI。

## 安全与隐私

- 题目与作答均按空间成员校验，非成员 404。
- 复习计划按用户隔离（`(question_id, user_id)` 主键）。

## 需要用户确认

1. 2.1 是否验收通过。
2. 下一步：2.2 考试与成绩，还是先做 RAG/PDF 或冲突合并 UI。

## 用户验收结果

待确认。
