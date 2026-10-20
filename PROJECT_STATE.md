# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：2 — 学习知识与评测
- 当前里程碑：2.1（题库、错题、间隔复习）— 完成，等待验收
- 已通过用户验收：阶段 0/1 未正式记录；用户已指示持续开发
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 54 通过（contracts 10、api 44）；Playwright 11 通过
- 数据库：PostgreSQL 16（Docker Compose，容器 `study-os-postgres`，持久卷），15 张表，迁移 0000–0005
- 部署状态：未部署
- 最近 commit：`545cad6`

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js / pnpm / Git | 24.22.0 / 10.34.7 / 2.55.0 |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16-alpine（Docker Compose，端口 5432） |
| Docker / WSL | Engine 29.8.2 / WSL 2.7.13 |
| AI | DeepSeek `deepseek-chat`（默认关闭，已做一次受控 smoke test） |

## 已验证命令

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | 通过 |
| `pnpm test` | 54 passed（contracts 10、api 44） |
| `pnpm test:e2e` | 11 passed（含题库创建、离线 outbox 重放） |
| `pnpm verify:db` | 容器 healthy、迁移成功、39 个 API 测试通过 |

## 已实现

- 阶段 1（1.1–1.5）：访客、空间、课程、任务、日历、笔记、专注、学习日志、文件、AI 网关、同步 pull/push、Dexie outbox 与统计。
- 阶段 2.1：
  - 题库：题目创建/列表/软删除（简答题、单选题字段）；
  - 作答与判分：`POST /api/v1/questions/:id/attempts`，答案归一化比较；
  - 错题：按用户取最近一次作答为错误的题目；
  - 间隔复习：简化 SM-2（答对 1→3→×ease 天，答错重置 1 天），`/api/v1/review/queue` 返回到期题目；
  - Web：空间页「题库」「今日复习」面板，可添加题目、提交答案并看到判分。

## 未完成项

- 考试与成绩/GPA、RAG 检索、PDF 注释未开始。
- 题库无编辑 UI、无批量导入、无单选选项编辑。
- 冲突合并 UI 未做；AI 未做长对话/限流测试。
- 账号/CSRF、对象存储、CI 远端运行未做。

## 下一步

1. 用户验收 2.1；继续 2.2（考试、成绩、错题统计）。
2. 或优先补 RAG/PDF、冲突合并 UI。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
