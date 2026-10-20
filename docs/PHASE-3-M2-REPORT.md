# 阶段 3.2 报告：多 Agent、学习计划、记忆提取与风险评分

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 实现

### 多 Agent 角色
- `GET /api/v1/agents`：planner / tutor / examiner / analyst 及描述
- `POST /api/v1/agents/:role/run`：角色提示词 + 记忆（≤10）+ 薄弱题（≤3）+ 用户输入；统一隐私拦截、月度预算、审计（purpose=`agent:<role>`）

### 学习计划 / 自适应教学
- 数据：`learning_plans`（steps JSON，状态 active/completed/archived）
- `POST /api/v1/learning-plans`：planner 生成 JSON 步骤（3–8 个，diagnose/study/practice/review）；AI 失败或格式错误时回退内置四步模板
- `GET /api/v1/learning-plans`、`PATCH /api/v1/learning-plans/:id/steps`
- 全部步骤 done 时自动置 completed
- Web：「学习计划」面板，生成计划、勾选步骤

### 记忆自动提取
- `POST /api/v1/memories/extract`：从对话文本提取事实/偏好/推断（≤5 条），带置信度与来源 `ai_extraction`

### 风险评分
- `GET /api/v1/analytics/overview` 新增 `riskScore`（0–100）：逾期任务、专注不足、考试偏低、薄弱题、专注下滑加权
- Web 洞察面板展示

## 测试

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 69 passed（contracts 10、api 59） |
| `pnpm test:e2e` | 12 passed |

新增 `apps/api/test/stage3-2.integration.test.ts`（4 个）：Agent 列表与 planner 运行、计划创建与步骤推进、记忆提取、riskScore。

## 未完成

- Agent 无工具调用/多步自主执行；计划未做完整诊断状态机。
- 冲突合并 UI、账号/CSRF、对象存储、CI 远端运行。
- 阶段 4 自动化/通知未开始。

## 需要用户确认

1. 阶段 3 是否验收。
2. 下一步进入阶段 4（自动化/通知），还是补跨阶段项。

## 用户验收结果

待确认。
