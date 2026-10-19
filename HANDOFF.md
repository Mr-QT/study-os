# HANDOFF — 新会话接手

1. 阅读 `AGENTS.md`、`PROJECT_STATE.md`、`TASKS.md`、`KNOWN_ISSUES.md`、`docs/ROADMAP.md`、`docs/PHASE-0-REPORT.md`。
2. 当前是阶段 0：工程骨架可运行，**业务功能未实现**；数据库连接已用便携版 PostgreSQL 验证，Docker Compose 尚未运行。
3. 启动方式：

   ```powershell
   pnpm install
   pnpm dev          # API :4000 + Web :3000
   ```

4. 验证命令：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`。
5. **重启后第一件事**（启用 WSL2 后）：

   ```powershell
   # 启动 Docker Desktop，等待引擎就绪
   pnpm verify:db    # 启动 postgres 容器 + 真实 DB 集成测试
   ```

6. 未解决问题：WSL2 待重启、Docker 编排未验证、ORM/迁移未选型、ADR 均待批准、CI 未远端运行。
7. 下一步：重启 → `pnpm verify:db` → 选定 ORM 并建首个迁移 → 提交阶段 0 验收。
8. 重大技术决策需用户确认；阶段 0 验收后才能开始阶段 1。
9. 每次交接补充：最近 commit、启动命令、测试命令/结果、未解决问题、下一步、等待用户确认的事项。
