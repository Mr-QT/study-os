# TASKS — 任务看板

| ID | 任务 | 状态 | 验收证据 |
|---|---|---|---|
| P0-01 | Windows 开发环境检查 | DONE | Node 24.22.0 / Git 2.55.0 / pnpm 10.34.7 实测 |
| P0-02 | 核心技术选型 spike 与 ADR | DONE | `docs/adr/0001–0011` |
| P0-03 | monorepo 与开发脚本 | DONE | pnpm workspace、tsconfig、ESLint/Prettier、`pnpm dev` |
| P0-04 | API、DB、PWA 骨架 | DONE | `/health` `/ready`、PostgreSQL、双语页面 |
| P0-05 | CI、测试与视觉 smoke | PARTIAL | 本地全绿；CI 未远端运行 |
| P0-06 | 阶段 0 验收与交接 | PARTIAL | 用户已指示进入阶段 1 |
| P1-01 | 访客身份、空间、schema、契约、权限、IndexedDB | DONE | 29 测试 + 8 E2E |
| P1-02 | 课程/学期、任务 CRUD、引用、基础日历 | DONE | 36 测试 + 9 E2E |
| P1-03 | 笔记、专注、学习日志、文件 | DONE | 42 测试 + 10 E2E；截图 `space-tools.png` |
| P1-04 | AI 基础与学习规划 | TODO | 需先确认模型提供方、密钥与预算 |
| P1-05 | outbox、增量同步、冲突与统计 | TODO | — |

状态限定：TODO / IN_PROGRESS / BLOCKED / PARTIAL / DONE（DONE 需证据）。
