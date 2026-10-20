# 阶段 3.1 报告：AI 记忆、学习分析/风险、导师答疑

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现

### AI 记忆
- 数据：`ai_memories`（迁移 `0008_dear_winter_soldier.sql`）
- API：`GET/POST /api/v1/memories`、`PATCH/DELETE /api/v1/memories/:id`
- 字段：scope（user/space/course）、kind（fact/preference/inference）、confidence、pinned、disabled、expiresAt
- 按用户隔离；写操作校验空间成员

### 学习分析与风险
- `GET /api/v1/analytics/overview?spaceId`
- 任务总数/完成/逾期；近 7 天与上一周期专注分钟；考试次数与平均分；薄弱题目（正确率 < 60%）；风险码
- 风险规则：任务逾期、近 7 天专注 < 60 分钟、考试平均 < 60、存在薄弱题

### 导师答疑
- `POST /api/v1/ai/tutor`（`apps/api/src/routes/tutor.ts`）
- 模式：socratic / explain
- 注入：用户记忆（≤20 条）+ 薄弱题（≤3 道）
- 复用 AI 网关：隐私拦截、月度预算、审计（purpose=tutor）

### Web
- `apps/web/components/insights-panel.tsx`：统计/风险/薄弱题、记忆增删停用、导师提问

## 测试

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 65 passed（contracts 10、api 55） |
| `pnpm test:e2e` | 12 passed |

新增 `apps/api/test/stage3.integration.test.ts`（4 个）：记忆 CRUD/停用、分析风险与薄弱题、导师上下文回答、跨用户隔离。

## 未完成

- 多 Agent 编排、自适应教学状态机、自动记忆提取、预测型风险。
- 冲突合并 UI、账号/CSRF、对象存储、CI 远端运行。

## 需要用户确认

1. 3.1 是否验收。
2. 继续 3.2（Agent 编排/自适应教学）还是先补跨阶段项。

## 用户验收结果

待确认。
