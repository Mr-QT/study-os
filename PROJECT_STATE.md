# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：2 — 学习知识与评测（功能完成）
- 当前里程碑：2.1 题库/错题/复习；2.2 考试/成绩/掌握度；2.3 本地 RAG 检索与 PDF 注释 API — 均完成
- 已知缺口：PDF 查看器与标注交互 UI 未实现（只有数据与 API）
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 61 通过（contracts 10、api 51）；Playwright 11 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），20 张表，迁移 0000–0007
- 部署状态：未部署
- 最近 commit：本次提交后更新

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
| 嵌入 | 本地 `Xenova/all-MiniLM-L6-v2`，384 维，模型经 `hf-mirror.com` 下载 |

## 已验证命令

| 命令 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `build` | 通过 |
| `pnpm test` | 61 passed（contracts 10、api 51） |
| `pnpm test:e2e` | 11 passed |
| `pnpm verify:db` | 容器 healthy、迁移成功 |

## 已实现

- 阶段 1：访客、空间、课程、任务、日历、笔记、专注、学习日志、文件、AI 网关、同步/离线 outbox、统计。
- 2.1：题库、判分、错题、简化 SM-2 复习队列与 UI。
- 2.2：考试创建/作答/自动判分、成绩与平均分、掌握度；Web 考试面板。
- 2.3：
  - **本地向量 RAG**：笔记/题目切块 → 本地 MiniLM 嵌入（384 维）→ `knowledge_chunks` 存储 → 余弦相似度语义检索；支持重建索引；
  - Web「知识检索」面板：搜索 + 重建索引；
  - PDF 注释数据与 API（按文件/页保存矩形与笔记）。

## 未完成项

- PDF 查看器与标注交互 UI（后端已具备数据）。
- 向量检索为 JSON 存储 + Node 内余弦计算，最多 5000 个 chunk；未上 pgvector/HNSW。
- 题库编辑/批量导入；单选选项编辑。
- 冲突合并 UI；账号/CSRF；对象存储；CI 远端运行。

## 下一步

1. 用户验收阶段 2。
2. 若要完整 PDF 体验：实现 PDF 渲染/框选标注 UI。
3. 或进入阶段 3（智能学习引擎/多 Agent）。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
