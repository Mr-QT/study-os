# ADR-0003：API 框架与错误/健康检查约定

- 状态：Proposed（待用户批准）
- 日期：2026-10-19
- 影响范围：`apps/api`、`packages/contracts`
- 背景与问题：需要一个 TypeScript 优先、类型友好、支持插件化路由与结构化日志的 HTTP 层，作为模块化单体的入口。

## 备选方案及证据

| 方案 | 优点 | 缺点 |
|---|---|---|
| Fastify 5（选中） | 内建 Pino 日志、schema 友好、插件封装、`inject()` 便于测试 | 生态不如 Express 大 |
| Express 5 | 生态最大、上手简单 | 类型与异步错误处理较弱，需自行拼装 |
| Hono | 轻量、多运行时 | 服务端插件/生态尚不匹配本项目 |

- 决策与理由：Fastify 5.12.7 + `@fastify/cors`；健康检查 `/health` 永远返回 200 并报告依赖状态，`/ready` 在依赖不可用时返回 503；所有错误使用统一 envelope（`NOT_FOUND` / `INTERNAL_ERROR`），并带 `requestId`。响应结构由 `packages/contracts` 的 Zod schema 校验。
- 安全/隐私/性能/成本影响：日志默认脱敏 `authorization` 与 `cookie`；无外部依赖。
- 回退方案：路由与业务逻辑与框架解耦在 `routes/`，迁移到 Express/Hono 需重写适配层，约 1–2 天。
- 需用户批准：是（批准记录：待补充）
