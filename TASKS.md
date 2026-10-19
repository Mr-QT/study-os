# TASKS — 任务看板

| ID | 任务 | 状态 | 验收证据 |
|---|---|---|---|
| P0-01 | Windows 开发环境检查 | DONE | Node 24.22.0 / Git 2.55.0 / pnpm 10.34.7 实测；`scripts/check-windows.ps1` 已运行 |
| P0-02 | 核心技术选型 spike 与 ADR | PARTIAL | `docs/adr/0001–0006` 已写；数据库/ORM/身份/检索/队列仍未验证，均为 Proposed |
| P0-03 | monorepo 与开发脚本 | DONE | pnpm workspace、tsconfig base、ESLint/Prettier、`pnpm dev` 可用 |
| P0-04 | API、DB、PWA 骨架 | PARTIAL | API `/health` `/ready` 与 Web 双语状态页完成；DB schema/迁移未完成 |
| P0-05 | CI、测试与视觉 smoke | PARTIAL | 单测 10、E2E 7 通过（含 axe A/AA、手机/平板无溢出）；截图已生成；CI 未远端运行 |
| P0-06 | 阶段 0 验收与交接 | TODO | 待 Docker/DB 验证后提交，等待用户批准 |

状态限定：TODO / IN_PROGRESS / BLOCKED / PARTIAL / DONE（DONE 需证据）。
