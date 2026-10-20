# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：3 — 智能学习引擎（完成）
- 当前里程碑：3.1 记忆/分析/导师；3.2 多 Agent、学习计划、记忆提取、风险评分 — 完成
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 69 通过（contracts 10、api 59）；Playwright 12 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），22 张表，迁移 0000–0009
- 部署状态：未部署
- 最近 commit：`a1b1355`

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js / pnpm / Git | 24.22.0 / 10.34.7 / 2.55.0 |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16-alpine（Docker Compose，端口 5432） |
| Docker / WSL | Engine 29.8.2 / WSL 2.7.13 |
| AI / 嵌入 / PDF | DeepSeek `deepseek-chat` / 本地 MiniLM / pdfjs-dist |

## 已验证命令

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 69 passed（contracts 10、api 59） |
| `pnpm test:e2e` | 12 passed |
| `pnpm verify:db` | 容器 healthy、迁移成功 |

## 已实现

- 阶段 1、2：完整学习平台、题库/考试/复习、本地 RAG、PDF 查看与标注。
- 3.1：AI 记忆 CRUD、学习分析/风险、导师答疑（记忆+薄弱题注入）。
- 3.2：
  - **多 Agent 角色**：planner / tutor / examiner / analyst；`/api/v1/agents` 与 `/api/v1/agents/:role/run`，统一隐私/预算/审计（purpose=`agent:<role>`）。
  - **学习计划/自适应教学**：`learning_plans`，planner 生成 JSON 步骤（诊断/学习/练习/复盘），失败回退内置模板；步骤可推进，全部完成自动置 completed。
  - **记忆自动提取**：`POST /api/v1/memories/extract`，从对话文本提取事实/偏好/推断（最多 5 条）。
  - **风险评分**：分析接口新增 0–100 `riskScore`（逾期、专注不足、考试偏低、薄弱题、专注下滑加权）。
  - Web：空间页新增「学习计划」面板（生成计划、勾选步骤）；洞察面板显示风险分。

## 未完成项（跨阶段）

- Agent 目前是“角色提示词 + 上下文”，没有工具调用/多步自主执行。
- 计划生成在 AI 失败时回退固定模板；未做完整诊断式自适应状态机。
- 冲突合并 UI、账号/CSRF、对象存储、CI 远端运行。
- 阶段 4（自动化/通知）及以后未开始。

## 下一步

1. 用户验收阶段 3。
2. 进入阶段 4（自动化引擎、通知与多渠道调度）。
3. 或先补跨阶段项（账号、冲突 UI、对象存储、CI）。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
