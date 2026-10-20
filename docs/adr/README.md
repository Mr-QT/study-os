# 架构决策记录（ADR）索引

本目录记录影响核心技术栈、数据、安全与协作方式的决策。模板见 `templates/ADR-TEMPLATE.md`。

| 编号 | 标题 | 状态 | 需要用户批准 |
|---|---|---|---|
| [0001](0001-monorepo-and-package-manager.md) | Monorepo 与包管理器（pnpm workspaces） | Proposed | 是 |
| [0002](0002-runtime-versions.md) | 运行时与框架版本基线 | Proposed | 是 |
| [0003](0003-api-framework.md) | API 框架与错误/健康检查约定（Fastify 5） | Proposed | 是 |
| [0004](0004-data-layer-pending.md) | 数据层（PostgreSQL + ORM 待定） | Superseded by 0007 | 否 |
| [0005](0005-i18n.md) | i18n 与本地化路由 | Proposed | 是 |
| [0006](0006-deferred-infrastructure.md) | 阶段 1 前待定的基础设施选型 | Proposed | 是 |
| [0007](0007-drizzle-orm.md) | 数据访问层（Drizzle ORM + SQL 迁移） | Proposed（已实现） | 是 |
| [0008](0008-guest-session.md) | 本地访客身份与签名 Cookie 会话 | Proposed（已实现） | 是 |
| [0009](0009-indexeddb-cache.md) | IndexedDB 空间缓存（Dexie） | Proposed（已实现） | 是 |
| [0010](0010-optimistic-concurrency.md) | 任务更新的乐观并发（version + 409） | Proposed（已实现） | 是 |
| [0011](0011-local-file-storage.md) | 本地文件存储（磁盘 + 元数据表） | Proposed（已实现） | 是 |
| [0012](0012-ai-gateway.md) | AI 网关（默认关闭、预算与隐私前置） | Proposed（已实现） | 是 |
| [0013](0013-incremental-sync.md) | 增量同步（变更日志 + push/pull） | Proposed（部分实现） | 是 |

## 状态说明

- **Proposed**：已记录候选与证据，尚未获得用户批准，不能当作既定事实。
- **Accepted**：用户已批准，实施时应遵守。
- **Superseded**：被后续 ADR 取代，保留历史记录。
