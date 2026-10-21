# PROJECT_STATE — 真实项目状态

- 日期：2026-10-21
- 当前阶段：5 — 多模态、迁移、成长与作品集（5.1 完成）
- 当前里程碑：5.1 学习目标、习惯打卡、成就与成长档案导出
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 97 通过（contracts 10、api 87）；Playwright 14 通过
- 数据库：PostgreSQL 16（Docker Compose，持久卷），29 张表，迁移 0000–0013
- 部署状态：未部署
- 最近 commit：`90ff9a9`

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
| `pnpm test` | 97 passed（contracts 10、api 87） |
| `pnpm test:e2e` | 13 passed（新增空间页 axe 无障碍） |
| `pnpm worker` | 启动成功，冒烟一次发送 4 条到期通知 |

## 已实现

- 阶段 1–3：学习平台、题库/考试/复习、RAG/PDF、AI 记忆、分析/风险、导师、多 Agent、学习计划、记忆提取。
- 4.1：自动化规则（trigger/conditions/actions）、运行记录、站内通知中心、规则与通知 UI。
- 4.2：
  - 通知延迟（`delayMinutes`）与去重（`dedupeKey`）；
  - `focus.completed`、`exam.submitted` 事件钩子，异常不影响主写入；
  - 独立通知 worker（`pnpm worker`，每 30s 发送到期站内通知，可优雅退出）；
  - 自然语言规则草案 `POST /api/v1/automation/rules/draft`（AI 生成、服务端校验、审计），Web 支持生成→预览→保存；
  - 任务 409 冲突自动按最新版本重试一次，失败才提示冲突；
  - 空间详情页 axe WCAG A/AA 回归；
  - **存储适配**：本地磁盘与 S3 兼容对象存储统一 `StorageAdapter`，文件上传/下载/删除走适配器；默认本地，S3 需 `STORAGE_DRIVER=s3` 与凭据；S3 路径尚未做真实 MinIO 集成测试。
  - **4.3 高级日历与通知**：重复事件（daily/weekly + recurrenceUntil）、事件提前提醒（0–10080 分钟、自动去重、更新/删除时重排）、免打扰时段顺延、每日摘要（可配置小时、按天去重）、偏好设置 API 与 UI；worker 每小时检查摘要候选。
  - **5.1 成长**：学习目标（专注分钟/完成任务/作答题数/完成考试，按区间自动计算进度）、习惯与每日打卡（同日累加、连续天数）、成就徽章、成长档案汇总与 Markdown 导出（含来源说明，不含原始笔记/题目内容）；Web「目标、习惯与成长档案」面板。

## 未完成项

- 邮件 / PWA 真实投递（需要 SMTP/推送凭据；当前计入 skipped）。
- 规则草案无独立审批角色（生成后可预览再保存）；
- 高级日历/通知（重复、勿扰、摘要）。
- 对象存储仅验证本地适配器与配置校验；S3 兼容路径未跑 MinIO 集成测试。
- 账号/CSRF、CI 远端运行。

## 下一步

1. 用户验收 4.2。
2. 对象存储适配接口（本地 + 可配置 S3 兼容端点）。
3. 有凭据后接 SMTP/PWA 投递。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
