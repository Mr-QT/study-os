# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：3 — 智能学习引擎
- 当前里程碑：3.1 AI 记忆、学习分析/风险、导师答疑 — 完成
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 65 通过（contracts 10、api 55）；Playwright 12 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），21 张表，迁移 0000–0008
- 部署状态：未部署
- 最近 commit：`76b62a6`

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
| `pnpm test` | 65 passed（contracts 10、api 55） |
| `pnpm test:e2e` | 12 passed |
| `pnpm verify:db` | 容器 healthy、迁移成功 |

## 已实现

- 阶段 1 与 2：完整学习基础平台、题库/考试/复习、本地 RAG、PDF 查看与标注。
- 3.1：
  - **AI 记忆**：`ai_memories`，支持用户/空间/课程范围、事实/偏好/推断、置信度、固定、停用、过期与删除；按用户隔离。
  - **学习分析与风险**：`/api/v1/analytics/overview` 汇总任务完成/逾期、近 7 天与上一周期专注分钟、考试平均分、薄弱题目，并生成风险码（overdue_tasks / low_focus / low_exam_score / weak_questions）。
  - **导师答疑**：`POST /api/v1/ai/tutor`，苏格拉底式/直接解释两种模式；自动注入记忆与薄弱题目作为上下文；走同一预算、隐私、审计网关。
  - Web：「学习洞察与导师」面板，显示统计/风险/薄弱题、管理记忆、向导师提问。

## 未完成项（阶段 3 剩余）

- 多 Agent 编排（Planner/Tutor/Examiner/Analyst 角色分工与调度）。
- 自适应教学路径（诊断→计划→练习→复盘的状态机）。
- 从对话中自动提取/更新记忆（目前手动添加）。
- 更复杂的风险预测（目前是规则阈值）。
- 跨阶段：冲突合并 UI、账号/CSRF、对象存储、CI 远端运行。

## 下一步

1. 用户验收 3.1。
2. 继续 3.2：Agent 编排与自适应教学。
3. 或转去补跨阶段项。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
