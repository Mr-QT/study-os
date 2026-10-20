# TASKS — 任务看板

| ID | 任务 | 状态 | 验收证据 |
|---|---|---|---|
| P0-01 | Windows 开发环境检查 | DONE | 实测 |
| P0-02 | 核心技术选型 spike 与 ADR | DONE | `docs/adr/0001–0013` |
| P0-03 | monorepo 与开发脚本 | DONE | pnpm workspace 等 |
| P0-04 | API、DB、PWA 骨架 | DONE | `/health`、PostgreSQL、双语 |
| P0-05 | CI、测试与视觉 smoke | PARTIAL | 本地全绿；CI 未远端运行 |
| P0-06 | 阶段 0 验收与交接 | PARTIAL | 用户已指示进入阶段 1 |
| P1-01 | 访客、空间、schema、权限、IndexedDB | DONE | 29 测试 + 8 E2E |
| P1-02 | 课程、任务、日历 | DONE | 36 测试 + 9 E2E |
| P1-03 | 笔记、专注、学习日志、文件 | DONE | 42 测试 + 10 E2E |
| P1-04 | AI 网关与学习建议 | DONE | 49 测试（AI 用 stub）；默认关闭；真实提供方未验证 |
| P1-05 | 增量同步、离线 outbox 与统计 | DONE | pull/push、Dexie outbox + 离线重放、stats；11 E2E 通过 |
| P1-06 | 冲突合并 UI | TODO | 当前仅刷新提示 |

状态限定：TODO / IN_PROGRESS / BLOCKED / PARTIAL / DONE（DONE 需证据）。
