# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：2 — 学习知识与评测（完成）
- 当前里程碑：2.1 题库/错题/复习；2.2 考试/成绩/掌握度；2.3 本地 RAG、关键词检索、PDF 查看与标注 — 均完成
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 61 通过（contracts 10、api 51）；Playwright 12 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），20 张表，迁移 0000–0007
- 部署状态：未部署
- 最近 commit：`71f5611`

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js / pnpm / Git | 24.22.0 / 10.34.7 / 2.55.0 |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16-alpine（Docker Compose，端口 5432） |
| Docker / WSL | Engine 29.8.2 / WSL 2.7.13 |
| AI | DeepSeek `deepseek-chat`（用户点击时调用） |
| 嵌入 / PDF | 本地 MiniLM 384 维（hf-mirror）/ pdfjs-dist 本地渲染 |

## 已验证命令

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 61 passed（contracts 10、api 51） |
| `pnpm test:e2e` | 12 passed（含 PDF 打开与标注保存） |
| `pnpm verify:db` | 容器 healthy、迁移成功 |

## 已实现

- 阶段 1：访客、空间、课程、任务、日历、笔记、专注、学习日志、文件、AI 网关、同步/离线 outbox、统计。
- 2.1：题库、判分、错题、简化 SM-2 复习队列与 UI。
- 2.2：考试创建/作答/自动判分、成绩与平均分、掌握度；考试面板。
- 2.3：
  - **本地向量 RAG**：切块 → MiniLM 嵌入 → `knowledge_chunks` → 余弦检索；搜索面板 + 重建索引；
  - 关键词检索 API；PDF 注释数据/API；
  - **PDF 查看器与标注 UI**：pdfjs-dist 画布渲染、翻页、点击添加标注（位置 + 笔记）、标注列表、按页跳转。

## 未完成项（跨阶段，不影响阶段 2 验收）

- PDF 标注是“点标记”，不是文本选中高亮；无 OCR。
- 向量检索为 JSON + Node 余弦，最多 5000 chunk；未上 pgvector/HNSW。
- 冲突合并 UI、账号体系/CSRF、对象存储、CI 远端运行。
- 题库编辑/批量导入、单选选项编辑。

## 下一步

1. 用户验收阶段 2（`docs/PHASE-2-M2-REPORT.md` + 本文档）。
2. 进入阶段 3（智能学习引擎 / 多 Agent）。
3. 或先补冲突合并 UI / 账号体系等跨阶段项。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
