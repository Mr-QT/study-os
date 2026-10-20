# HANDOFF — 新会话接手

1. 阅读 `AGENTS.md`、`PROJECT_STATE.md`、`TASKS.md`、`KNOWN_ISSUES.md`、`docs/ROADMAP.md`、`docs/PHASE-1-M2-REPORT.md`。
2. 当前是阶段 1，里程碑 1.1/1.2 已完成：访客、空间、课程、任务、日历事件、IndexedDB 缓存。
3. 启动方式：

   ```powershell
   pnpm install
   $env:DATABASE_URL="postgres://studyos@127.0.0.1:55432/studyos"
   pnpm db:migrate
   pnpm dev
   ```

4. 本地数据库：Docker 仍不可用；当前使用便携版 PostgreSQL 16.14（端口 55432，临时目录）。
5. 验证命令：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`（后两者需 `DATABASE_URL` 才覆盖数据库用例）。
6. 未解决问题：WSL2 待真正重启、Docker 编排未验证、账号/CSRF 未实现、离线写入属 1.5、CI 未远端运行。
7. 下一步：用户验收 1.2 → 里程碑 1.3（Markdown 笔记、文件、专注会话与学习日志）。
8. 重大技术决策需用户确认；每个里程碑结束必须停下等待验收。
9. 每次交接补充：最近 commit、启动命令、测试命令/结果、未解决问题、下一步、等待用户确认的事项。
