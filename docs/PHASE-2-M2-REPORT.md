# 阶段 2 报告（考试、成绩、掌握度、检索与 PDF 注释）

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现

### 考试与成绩
- 数据：`exams`、`exam_questions`、`exam_attempts`（迁移 `0006_yellow_slipstream.sql`）
- API（`apps/api/src/routes/assessment.ts`）：
  - `POST/GET /api/v1/exams`：从题库选题创建考试；详情不返回答案
  - `POST /api/v1/exams/:id/attempts`：开始考试
  - `POST /api/v1/exam-attempts/:id/submit`：自动判分、记录作答、返回逐题结果
  - `GET /api/v1/grades`：成绩列表与平均分
  - `GET /api/v1/mastery`：按题目的尝试次数、正确数与正确率
- Web：`apps/web/components/exams-panel.tsx`（选题建卷、开始考试、作答提交、成绩/平均分）

### 检索与 PDF 注释
- 数据：`pdf_annotations`
- API（`apps/api/src/routes/knowledge.ts`）：
  - `GET /api/v1/search?spaceId&q`：笔记与题目关键词检索
  - `POST/GET /api/v1/pdf-annotations`：按文件/页保存高亮矩形与笔记

## 测试

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 59 passed（contracts 10、api 49） |
| `pnpm test:e2e` | 11 passed |
| `pnpm verify:db` | 容器 healthy、迁移成功、39 个 API 测试通过 |

新增 `apps/api/test/assessment.integration.test.ts`（5 个）：建卷不泄露答案、作答判分、成绩与平均分、掌握度、关键词检索、PDF 注释、跨用户隔离。

## 未完成（如实说明）

- **向量 RAG 未实现**：需要确定嵌入模型（OpenAI/本地 bge 等）与向量存储（pgvector 等），当前只有关键词检索。
- **PDF 查看器与标注 UI 未实现**：后端可保存注释，前端还没有 PDF 视图。
- 搜索无 UI；题库无编辑/批量导入。

## 需要用户确认

1. 阶段 2 是否验收（建议：功能验收通过；RAG 作为独立后续项）。
2. 是否需要现在投入向量 RAG；若要，请选择嵌入模型与是否使用 pgvector。
3. 下一步：阶段 3（智能学习引擎/多 Agent）或补 PDF 查看器/冲突合并 UI。

## 用户验收结果

待确认。
