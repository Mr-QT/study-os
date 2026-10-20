# HANDOFF — 新会话接手

1. 阅读 `AGENTS.md`、`PROJECT_STATE.md`、`TASKS.md`、`KNOWN_ISSUES.md`、`docs/ROADMAP.md`、`docs/PHASE-1-M45-REPORT.md`。
2. 当前是阶段 1：1.1–1.5 完成（1.5 仅缺冲突合并 UI）。
3. 启动方式：

   ```powershell
   pnpm install
   pnpm db:up          # Docker Desktop，PostgreSQL 16
   pnpm db:migrate
   pnpm dev
   ```

4. 本地数据库：Docker Compose 容器 `study-os-postgres`，端口 5432，持久卷；根目录 `.env` 已配置 `DATABASE_URL`。
5. 验证命令：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`、`pnpm verify:db`。
6. AI 默认关闭：设置 `AI_PROVIDER=openai|ollama`、`AI_API_KEY`、`AI_MODEL`、`AI_MONTHLY_BUDGET_USD` 后启用；私密空间只允许 Ollama。
7. 未解决问题：冲突合并 UI、AI 真实提供方未验证、账号/CSRF 未实现、文件仅本地磁盘、CI 未远端运行。
8. 下一步：用户验收 1.4/1.5 后进入阶段 2（知识与评测）。
9. 每个里程碑结束必须停下等待用户验收；重大技术决策需用户确认。
