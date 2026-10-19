# Codex 第一次启动提示词（复制全文）

请作为 Study OS 项目的技术负责人，**仅执行阶段 0：架构验证与工程初始化**。不要试图一次性完成 50 项需求或所有业务模块。

## 第一步：读取并复述约束

阅读 `README.md`、`AGENTS.md`、`docs/DECISIONS-50.md`、`docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/DATA-MODEL.md`、`docs/ROADMAP.md`、`docs/QUALITY-AND-ACCEPTANCE.md`、`PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`。确认第 24/36/37 项范围不能扩大。列出当前文件与缺失的应用代码，不能声称已有功能已实现。

## 第二步：检查 Windows 环境

确认 Windows/WSL2、Git、Node.js LTS、Python、Docker Desktop 的实际可用情况；可运行 `scripts/check-windows.ps1`。遇到缺失依赖时给出清晰的安装指导，不得在未经许可时安装系统级软件或修改系统安全设置。

## 第三步：提交阶段 0 小计划

规划 monorepo、包管理器、API schema、数据库迁移、IndexedDB、身份与同步方案。对 ORM、队列、认证、同步、向量检索等关键选择做最小可运行验证并生成 ADR 草案。涉及重大架构决策时先征得我的确认。

## 第四步：经确认后实现基础工程

创建 Next.js 前端、TypeScript 核心 API、必要时 Python/FastAPI 服务骨架、PostgreSQL Docker Compose、共享 schema、Design Tokens、i18n zh-CN/en、健康检查、基本单测/集成测试、Playwright smoke、lint/typecheck、CI 和 `.env.example`。所有服务可独立启动、无 API Key 时不应崩溃；前端需显示明确的连接状态。避免无意义的占位模块和伪功能。

## 第五步：验证并交接

运行真实启动和测试，记录实际结果；提供 Windows PowerShell/WSL2 运行步骤、可访问地址、关键截图、失败项、ADR、代码目录树。更新 `PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`KNOWN_ISSUES.md`。

**阶段 0 完成后必须停止，等待我明确验收。未经我确认，不进入阶段 1。**
