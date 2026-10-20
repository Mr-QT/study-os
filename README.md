# Study OS — 个人 AI 学习工作台

> 产品定位：个人优先、轻量协作、AI 驱动、本地优先且可云端同步的长期学习操作系统。
> 当前状态：**阶段 4 进行中**——阶段 1–3 完成；4.1 已加入自动化规则、运行记录与站内通知中心。

## 快速开始（Windows）

前置：Node.js ≥ 22、pnpm 10.34.7、Git。本机实测：Node 24.22.0、pnpm 10.34.7、Git 2.55.0。

```powershell
pnpm install
pnpm db:up          # Docker Desktop，PostgreSQL 16
pnpm db:migrate
pnpm dev
```

- Web：http://127.0.0.1:3000（自动跳转 `/zh-CN`，可切换 `/en`）
- API：http://127.0.0.1:4000/health、http://127.0.0.1:4000/ready
- 根目录 `.env` 已配置 `DATABASE_URL`（本地，未提交）；新环境复制 `.env.example` 并填写。
- 未配置 `DATABASE_URL` 时，页面仍可打开，空间接口返回 503 并显示「数据库未配置」。
- 拉取镜像若超时，可配置镜像源或手动拉取后打 tag（本机使用 `docker.m.daocloud.io`）。

### 质量命令

| 命令 | 说明 |
|---|---|
| `pnpm lint` | ESLint（全仓） |
| `pnpm typecheck` | 全部 workspace 的 `tsc --noEmit` |
| `pnpm test` | 契约与 API 单元/集成测试（Vitest） |
| `pnpm build` | API 打包（tsup）+ Web 生产构建 |
| `pnpm test:e2e` | Playwright smoke，自动拉起 API/Web |
| `pnpm db:up` / `pnpm db:down` | 本地 PostgreSQL（需 Docker Desktop） |
| `pnpm db:migrate` | 应用 SQL 迁移（需要 `DATABASE_URL`） |
| `pnpm verify:db` | 启动容器、迁移并跑真实数据库集成测试（重启后使用） |

### 仓库结构

```text
apps/web              Next.js 16 PWA（空间、课程/任务、笔记、专注、文件）
apps/api              Fastify 5 模块化单体（auth/spaces/courses/tasks/calendar/notes/focus/files）
packages/contracts    Zod 共享契约与 DTO
packages/db           Drizzle schema 与 SQL 迁移
docs/adr              架构决策记录（Proposed，待批准）
infra/docker          PostgreSQL Compose
tests/e2e             Playwright（工作台、axe、多视口）
```

## 文档索引

- `docs/DECISIONS-50.md`：50 项访谈决定的完整映射（唯一需求基线）
- `docs/PRD.md`：产品需求、功能矩阵、用户故事和验收
- `docs/ARCHITECTURE.md`：技术栈、模块、离线同步、安全、AI、插件
- `docs/DATA-MODEL.md`：核心实体、约束、审计和迁移
- `docs/API-CONTRACTS.md`：接口约定、事件、同步协议与错误模型
- `docs/DESIGN-SYSTEM.md`：Modern Calm Study OS UI 规范
- `docs/ROADMAP.md`：阶段划分、依赖和退出条件
- `docs/QUALITY-AND-ACCEPTANCE.md`：测试策略、真实场景与验收证据
- `docs/SECURITY-PRIVACY.md`：隐私分级、AI 授权、权限、密钥和备份
- `docs/OPERATIONS.md`：部署、监控、费用、升级、存储生命周期
- `docs/ONBOARDING-AND-I18N.md`：初始化向导、中英双语和无障碍
- `docs/adr/`：本仓库的架构决策记录
- `prompts/MASTER-PROMPT.md`：全局 Codex 总提示词
- `prompts/00-FIRST-RUN.md`：第一次启动的执行指令
- `prompts/phases/`：分阶段执行指令
- `prompts/CONTINUE.md`、`prompts/REVIEW.md`、`prompts/FIX.md`：长期维护指令
- `AGENTS.md`：Codex 工作约束（适用于本仓库）
- `PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`KNOWN_ISSUES.md`：动态维护状态
- `checklists/MILESTONE-ACCEPTANCE.md`：每个里程碑验收清单

## 范围与真实交付

- **全部 50 项决定属于产品最终蓝图，不意味着阶段 1 全部完成。**
- 每个阶段必须提供可运行代码、真实持久化、测试证据和验收说明。未实现项明确标记为 `PLANNED`，不可标记为 `DONE`。
- 阶段 0 已建立工程骨架；业务功能仍未实现，当前页面只展示真实的服务连接状态。
- 不得在未经批准时调用付费 API、部署到公网上、删除用户数据、上传私密资料或进行破坏性迁移。
- `MANIFEST.json` 是启动包初始快照的校验清单；工程文件加入后不再与其匹配，属于预期漂移。
