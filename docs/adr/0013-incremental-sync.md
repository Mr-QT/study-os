# ADR-0013：增量同步（变更日志 + push/pull）

- 状态：Proposed（部分实现，待用户批准）
- 日期：2026-10-20
- 影响范围：多端同步、冲突处理、离线队列
- 背景与问题：阶段 1.5 需要增量同步与冲突可见。完整 outbox/CRDT 成本高，先在服务端建立可验证的变更流。

## 决策与理由

- `sync_changes` 追加式变更日志：`(id serial, space_id, entity_type, entity_id, operation, version, created_at)`；`id` 即游标。
- 任务与笔记的创建/更新/删除都会写入变更（当前在路由内显式记录）。
- `GET /api/v1/sync/pull?spaceId&cursor&limit`：按游标增量拉取，返回 `nextCursor` 与 `hasMore`。
- `POST /api/v1/sync/push`：批量操作，逐条返回 `accepted / conflict / rejected`；`baseVersion` 不匹配返回 `conflict` 与当前版本，不静默覆盖。
- 权限：push 需要编辑权限，pull 需要读权限；非成员 404。

## 尚未实现

- 客户端持久 outbox、离线编辑队列、自动重放与冲突 UI。
- 实体 payload 未包含在变更中（客户端按 `entityId` 再拉取）；后续可加压缩 payload。
- 变更日志未做保留期清理。

## 安全/隐私/性能/成本影响

- 日志包含实体 id 与操作类型，不含正文；按空间隔离。
- 单表单调增长，后续需归档策略。

## 回退方案

可停用 push/pull 路由并删除日志；现有 CRUD 不受影响。

## 需用户批准：是（批准记录：待补充）
