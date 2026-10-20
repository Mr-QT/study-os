# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：2 — 学习知识与评测
- 当前里程碑：2.1 题库/错题/复习（完成）；2.2 考试/成绩/掌握度（完成）；2.3 检索与 PDF 注释（API 完成，UI 部分）
- 已通过用户验收：阶段 0/1 未正式记录；用户已指示持续开发
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 59 通过（contracts 10、api 49）；Playwright 11 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），19 张表，迁移 0000–0006
- 部署状态：未部署
- 最近 commit：`d5b84cc`

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js / pnpm / Git | 24.22.0 / 10.34.7 / 2.55.0 |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16-alpine（Docker Compose，端口 5432） |
| Docker / WSL | Engine 29.8.2 / WSL 2.7.13 |
| AI | DeepSeek `deepseek-chat`（已配置，默认只在你点击时调用） |

## 已验证命令

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | 通过 |
| `pnpm test` | 59 passed（contracts 10、api 49） |
| `pnpm test:e2e` | 11 passed |
| `pnpm verify:db` | 容器 healthy、迁移成功、39 个 API 测试通过 |

## 已实现

- 阶段 1：访客、空间、课程、任务、日历、笔记、专注、学习日志、文件、AI 网关、同步/离线 outbox、统计。
- 阶段 2.1：题库（创建/列表/删除）、作答判分、错题、简化 SM-2 间隔复习与到期队列、题库/复习 UI。
- 阶段 2.2：考试（从题库选题创建）、开始考试、提交后自动判分、成绩列表与平均分、知识掌握度（按题目正确率）；Web 考试与成绩面板。
- 阶段 2.3：
  - 关键词检索 `/api/v1/search`（笔记标题/正文、题目/答案，ILIKE）；
  - PDF 注释 API（`pdf_annotations`，按文件/页存储高亮矩形与笔记）；
  - 尚未实现向量 RAG 与 PDF 查看器/标注 UI。

## 未完成项

- 真正的向量 RAG（需要嵌入模型与 pgvector/向量库选型）；当前只有关键词检索。
- PDF 查看器与标注交互 UI（后端已存注释）。
- 题库编辑/批量导入、单选选项编辑。
- 冲突合并 UI；账号体系与 CSRF；对象存储；CI 远端运行。

## 下一步

1. 用户验收阶段 2。
2. 若要“完整 RAG”：确定嵌入模型（OpenAI/本地 bge 等）与向量存储方案，再实现切块、索引与引用。
3. 或进入阶段 3（智能学习引擎/多 Agent）。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
