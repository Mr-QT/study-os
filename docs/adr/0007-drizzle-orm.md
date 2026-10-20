# ADR-0007：数据访问层采用 Drizzle ORM + SQL 迁移

- 状态：Proposed（已实现，待用户批准）
- 日期：2026-10-20
- 影响范围：`packages/db`、`apps/api`、CI、迁移流程
- 背景与问题：里程碑 1.1 需要真实持久化（用户、空间、成员关系）。阶段 0 的 ADR-0004 只确定了 PostgreSQL，ORM 仍待选。需要可审阅的 SQL 迁移、类型安全查询、在 Windows/CI 上稳定运行。

## 备选方案及证据

| 方案 | 优点 | 缺点 | 证据 |
|---|---|---|---|
| Drizzle ORM + drizzle-kit（选中） | SQL 贴近、schema 即类型、迁移是可直接审阅的 SQL、无需生成引擎 | 生态较新，复杂关系需手写 | 3 张表迁移在 PG 16.14 上成功应用；19 个 API 测试通过 |
| Prisma | 迁移与 Studio 成熟 | 引擎体积大、生成步骤多、Windows 下额外二进制 | 未实测 |
| Kysely | 纯查询构建、类型安全 | 迁移与建模需自建 | 未实测 |

## 决策与理由

- 在 `packages/db` 中定义 schema（`users`、`spaces`、`memberships`），由 `drizzle-kit generate` 生成 SQL 迁移，`drizzle-kit migrate` 应用；
- API 通过 `createDb(pool)` 注入数据库句柄，避免模块级单例，便于测试隔离；
- 未配置 `DATABASE_URL` 时 API 仍可启动，数据接口返回 503，健康检查显示 `disabled`；
- CI 使用 PostgreSQL 16 service，并在测试前执行 `pnpm db:migrate`。

## 安全/隐私/性能/成本影响

- 所有查询使用参数化 SQL（Drizzle 生成），降低注入风险；
- 迁移文件进入版本控制，可审计；
- 连接池上限 10，健康检查 1.5s 超时。

## 回退方案

ORM 通过仓储层隔离，替换为 Prisma/Kysely 需要重写查询与迁移，预计 2–3 天；数据模型本身不变。

## 需用户批准：是（批准记录：待补充）
