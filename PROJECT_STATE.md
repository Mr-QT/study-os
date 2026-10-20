# PROJECT_STATE — 真实项目状态

- 日期：2026-10-20
- 当前阶段：1 — 完整基础平台与核心学习闭环
- 当前里程碑：1.3（Markdown 笔记、专注会话、学习日志、文件上传）— 完成，等待验收
- 已通过用户验收：阶段 0 未正式记录；用户已指示继续阶段 1
- 应用代码：`apps/web`、`apps/api`、`packages/contracts`、`packages/db`
- 测试结果：单元/集成 42 通过（contracts 10、api 32）；Playwright 10 通过
- 部署状态：未部署
- 数据库：PostgreSQL 16.14（便携实例，端口 55432），10 张表，迁移 0000–0003 已应用
- 已确认技术基线：见 `docs/adr/`（全部为 Proposed，待批准）
- 最近 commit：提交后更新

## 环境（实测）

| 项目 | 值 |
|---|---|
| OS | Windows 10 Enterprise 25H2，build 26200 |
| Node.js | 24.22.0（`D:\nodejs`） |
| pnpm | 10.34.7（用户级前缀） |
| Git | 2.55.0（`D:\Git`） |
| Next.js / React | 16.4.2 / 19.3.1 |
| Fastify / Zod / Drizzle | 5.12.7 / 4.6.7 / 见 lockfile |
| PostgreSQL | 16.14（便携实例，端口 55432） |
| Playwright | 1.64.1 |
| Docker Desktop | 4.95.0（已安装，WSL2 仍待真正重启） |

## 已验证命令与结果（2026-10-20）

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过，0 错误 |
| `pnpm typecheck` | contracts / db / api / web 全部通过 |
| `pnpm db:migrate` | 0000–0003 迁移成功 |
| `pnpm test`（带 `DATABASE_URL`） | 42 passed（contracts 10、api 32） |
| `pnpm test:e2e`（带数据库） | 10 passed（含笔记、专注、文件上传、课程/任务/事件、axe） |
| `pnpm build` | API 打包与 Web 构建成功 |

## 已实现

- 1.1：访客会话、学习空间、成员权限、Drizzle 迁移、IndexedDB 缓存。
- 1.2：学期/课程、任务 CRUD（版本冲突 409）、日历事件、空间详情页。
- 1.3：
  - 笔记：Markdown 创建/读取/更新/软删除，版本冲突检测，按空间列表；Web 端用 react-markdown 渲染（默认不执行原始 HTML）。
  - 专注：开始/结束会话、时长计算、同一用户同空间仅一个未结束会话、最近会话列表。
  - 学习日志：按日聚合已完成专注会话的分钟数（`/api/v1/learning-logs`）。
  - 文件：multipart 上传（10MB、MIME 白名单）、SHA-256、列表、鉴权下载、软删除。
  - Web：空间详情页新增笔记、专注、文件三个面板；中文/英文文案。

## 未完成项

- 笔记暂无编辑 UI（API 支持 PATCH）、无文件夹/双链/搜索。
- 专注无暂停、无番茄钟预设、无任务绑定 UI（API 支持 taskId）。
- 文件无病毒扫描、无配额、无版本；本地磁盘仅支持单实例。
- 账号体系、设备撤销、CSRF token 未实现。
- 同步、离线写入、AI、复习考试未开始。
- Docker Compose 编排仍未运行（WSL2 未真正重启）。
- CI 尚未在 GitHub Actions 远端运行。
- 无障碍：axe 自动扫描无违规；未做读屏/键盘人工走查。

## 下一步

1. 用户验收里程碑 1.3（`docs/PHASE-1-M3-REPORT.md`）。
2. 进入 1.4：AI 基础与学习规划（需先确认模型提供方、密钥与预算策略）。
3. 真正重启后补做 `pnpm verify:db`。

> 每次修改都需附实际证据；禁止未经运行验证标记 DONE。
