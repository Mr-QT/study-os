# HANDOFF — 新会话接手

1. 阅读 `AGENTS.md`、`PROJECT_STATE.md`、`TASKS.md`、`KNOWN_ISSUES.md`、`docs/ROADMAP.md`。
2. 当前是阶段 0：工程骨架已可运行，**业务功能未实现**。
3. 启动方式：

   ```powershell
   pnpm install
   pnpm dev          # API :4000 + Web :3000
   ```

4. 验证命令：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`。
5. 未解决问题：Docker/WSL2 未安装、数据库未验证、ADR 均待批准、CI 未远端运行。
6. 下一步：安装 Docker Desktop + WSL2 → 验证 PostgreSQL Compose 与迁移 → 提交阶段 0 验收。
7. 重大技术决策需用户确认；阶段 0 验收后才能开始阶段 1。
8. 每次交接补充：最近 commit、启动命令、测试命令/结果、未解决问题、下一步、等待用户确认的事项。
