# HANDOFF — 新会话接手

1. 阅读 `AGENTS.md`、`PROJECT_STATE.md`、`TASKS.md`、`KNOWN_ISSUES.md`、`docs/ROADMAP.md`、`docs/PHASE-1-M45-REPORT.md`。
2. 当前是阶段 1：1.1–1.4 完成，1.5 部分完成（同步 pull/push 与统计；客户端 outbox 未做）。
3. 启动方式：

   ```powershell
   pnpm install
   $env:DATABASE_URL="postgres://studyos@127.0.0.1:55432/studyos"
   pnpm db:migrate
   pnpm dev
   ```

4. 本地数据库：Docker 仍不可用；使用便携版 PostgreSQL 16.14（端口 55432，`%TEMP%`）。
5. 验证命令：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`（后两者需 `DATABASE_URL`）。
6. AI 默认关闭：设置 `AI_PROVIDER=openai|ollama`、`AI_API_KEY`、`AI_MODEL`、`AI_MONTHLY_BUDGET_USD` 后启用；私密空间只允许 Ollama。
7. 未解决问题：客户端 outbox/离线重放未实现、AI 真实提供方未验证、账号/CSRF 未实现、文件仅本地磁盘、Docker 未验证、CI 未远端运行。
8. 下一步：完成 1.5 的 Dexie outbox 与冲突 UI；或按用户优先级进入阶段 2。
9. 每个里程碑结束必须停下等待用户验收；重大技术决策需用户确认。
