# TASKS — 任务看板

| ID | 任务 | 状态 | 验收证据 |
|---|---|---|---|
| P0-01 | Windows 开发环境检查 | DONE | Node 24.22.0 / Git 2.55.0 / pnpm 10.34.7 实测 |
| P0-02 | 核心技术选型 spike 与 ADR | DONE | `docs/adr/0001–0009`；Drizzle/身份/IndexedDB 已落地为 Proposed |
| P0-03 | monorepo 与开发脚本 | DONE | pnpm workspace、tsconfig、ESLint/Prettier、`pnpm dev` |
| P0-04 | API、DB、PWA 骨架 | DONE | `/health` `/ready`、PostgreSQL 连接与就绪、双语状态页 |
| P0-05 | CI、测试与视觉 smoke | PARTIAL | 本地全绿；CI 未远端运行 |
| P0-06 | 阶段 0 验收与交接 | PARTIAL | 清单已交付，用户指示直接进入阶段 1 |
| P1-01 | 访客身份、空间、schema、契约、权限、IndexedDB | DONE | 29 单测/集成 + 8 E2E；迁移已应用；截图见 `docs/screenshots/` |
| P1-02 | 课程/学期与任务 CRUD、引用、基础日历 | TODO | 待用户批准 1.1 后开始 |
| P1-03 | 笔记、文件与专注 | TODO | — |
| P1-04 | AI 基础与学习规划 | TODO | — |
| P1-05 | outbox、增量同步、冲突与统计 | TODO | — |

状态限定：TODO / IN_PROGRESS / BLOCKED / PARTIAL / DONE（DONE 需证据）。
