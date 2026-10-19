# ADR-0001：Monorepo 与包管理器

- 状态：Proposed（待用户批准）
- 日期：2026-10-19
- 影响范围：仓库结构、依赖安装、CI、后续所有包
- 背景与问题：Study OS 需要 Web（Next.js）、API（Node/TS）、共享契约与后续 AI 服务共存，且大量类型与 schema 需要跨包共享。需要一个安装快、支持 workspace 协议、Windows 下稳定的方案。

## 备选方案及证据

| 方案 | 优点 | 缺点 | 证据 |
|---|---|---|---|
| pnpm workspaces（选中） | 硬链接节省磁盘、workspace 协议、严格依赖边界、速度快 | 团队需统一版本；Windows 需注意长路径（已启用） | 本机 pnpm 10.34.7 安装 109 个包用时 3.6s；`pnpm install --frozen-lockfile` 可复现 |
| npm workspaces | 零额外工具 | 幽灵依赖更易出现，安装慢 | 未实测 |
| Turborepo / Nx 叠加 | 远程缓存、任务图 | 阶段 0 规模不需要，增加复杂度 | 未实测 |

- 决策与理由：采用 pnpm 10 workspaces，工作区为 `apps/*` 与 `packages/*`；暂不引入 Turborepo，等构建时间成为瓶颈再加。`packageManager` 字段锁定 `pnpm@10.34.7`。
- 安全/隐私/性能/成本影响：无运行时影响；CI 使用 `--frozen-lockfile` 保证可复现。
- 回退方案：迁移到 npm workspaces 只需改 lockfile 与少量脚本，成本低。
- 需用户批准：是（批准记录：待补充）
