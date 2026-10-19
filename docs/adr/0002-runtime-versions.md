# ADR-0002：运行时与框架版本基线

- 状态：Proposed（待用户批准）
- 日期：2026-10-19
- 影响范围：全仓库
- 背景与问题：启动包要求“不凭空锁死版本”，但阶段 0 必须有可运行基线。需要记录实测通过的版本，供后续升级决策参考。

## 实测版本（2026-10-19）

| 组件 | 版本 | 说明 |
|---|---|---|
| Node.js | 24.22.0（LTS） | 安装于 `D:\nodejs`；仓库声明 `>=22` |
| pnpm | 10.34.7 | 见 ADR-0001 |
| TypeScript | 5.9.3 | strict 模式 |
| Next.js | 16.4.2 | App Router + Turbopack 构建 |
| React | 19.3.1 | Next 16 要求 |
| Tailwind CSS | 4.3.3 | `@tailwindcss/postcss` |
| Fastify | 5.12.7 | 见 ADR-0003 |
| Zod | 4.6.7 | 共享契约 |
| Vitest | 5.0.5 | 单元测试 |
| Playwright | 1.64.1 | E2E smoke |

## 备选方案及证据

- Node 22 LTS 同样受支持；本机已装 24.22.0，且 CI 与本地一致更简单，故以 24 为基线。
- Next.js 16 为当前稳定版；升级到更高大版本前需重新跑通 `typecheck/test/build/e2e`。
- 证据：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e` 全部通过（见 PROJECT_STATE）。

- 决策与理由：以上版本组合作为阶段 0 基线；`engines.node >=22` 允许 22/24，CI 固定 24。
- 安全/隐私/性能/成本影响：无额外成本；依赖更新需走常规升级与回归。
- 回退方案：降级 Next/React 需同步调整 `transpilePackages` 与构建脚本，预计半天内可回退。
- 需用户批准：是（批准记录：待补充）
