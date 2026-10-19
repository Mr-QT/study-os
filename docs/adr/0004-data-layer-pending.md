# ADR-0004：数据层（PostgreSQL + ORM）— 待验证

- 状态：Proposed（未验证，不得视为已决定）
- 日期：2026-10-19
- 影响范围：数据库、迁移、同步、备份
- 背景与问题：启动包要求 PostgreSQL（云端/自托管）+ IndexedDB（本地）。阶段 0 需要给出可运行的最小数据层，但 ORM 与迁移工具尚未实测。

## 备选方案及证据

| 方案 | 优点 | 缺点 | 状态 |
|---|---|---|---|
| PostgreSQL 16 + Drizzle ORM | SQL 贴近、类型生成、迁移可审阅 | 生态较新，复杂关系需手写 | 未实测 |
| PostgreSQL 16 + Prisma | 迁移与 Studio 成熟 | 引擎较重、生成步骤多 | 未实测 |
| PostgreSQL 16 + Kysely | 纯查询构建、类型安全 | 迁移与建模需自行组织 | 未实测 |

- 当前决策：**只确定 PostgreSQL 16（Docker Compose）为候选数据库**；ORM 暂不选定。`apps/api` 仅在设置 `DATABASE_URL` 时连接数据库，未设置时健康检查返回 `disabled`，保证本地零依赖可运行。
- 已验证（2026-10-19）：临时便携版 PostgreSQL 16.14 上，`/health` 返回 `checks.database="ok"`，`/ready` 返回 200 `ready`；`apps/api/test/database.integration.test.ts` 2 个用例通过，未设置 `DATABASE_URL` 时自动跳过。Docker Compose 编排本身仍未运行。
- 待验证：容器启动、迁移工具、事务与回滚、连接池、时区处理。
- 安全/隐私/性能/成本影响：数据库凭据只经环境变量传入；默认仅监听本机端口。
- 回退方案：ORM 可替换，迁移脚本需重写；业务层通过仓储接口隔离。
- 需用户批准：是（批准记录：待补充）
