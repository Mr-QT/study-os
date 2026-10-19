# API、事件和同步契约

## 通用约定
- 所有外部 API 版本化：`/api/v1`；JSON 请求/响应由 schema 驱动生成客户端与 OpenAPI 文档。
- 错误结构：`{ code, message, details?, correlationId, retryable }`；错误码区分 `UNAUTHORIZED`、`FORBIDDEN`、`CONFLICT`、`VALIDATION_ERROR`、`RATE_LIMITED`、`PRIVACY_DENIED`、`BUDGET_EXCEEDED`、`OFFLINE`。
- 修改接口使用幂等键；乐观并发使用 `version` 或 `If-Match`；服务端检查资源归属与授权。

## 初始 API 资源（示例，不代表已实现）

```text
GET/POST       /api/v1/spaces
GET/PATCH      /api/v1/spaces/:id
GET/POST       /api/v1/courses
GET/POST       /api/v1/tasks
PATCH          /api/v1/tasks/:id
GET/POST       /api/v1/calendar/events
GET/POST       /api/v1/notes
POST           /api/v1/files/presign-or-upload
POST           /api/v1/ai/requests
GET            /api/v1/ai/usage
POST           /api/v1/sync/push
GET            /api/v1/sync/pull?cursor=...
GET            /api/v1/health
```

## 同步操作示意

```json
{
  "deviceId": "device-uuid",
  "operations": [{
    "opId": "uuid",
    "entityType": "task",
    "entityId": "uuid",
    "baseVersion": 3,
    "action": "patch",
    "patch": {"status": "done"},
    "spaceId": "uuid"
  }]
}
```

服务端对每条操作返回 `accepted/conflict/rejected`、新版本、冲突详情和 cursor；客户端保留失败操作供用户处理，不静默丢弃。跨设备权限撤销须立即生效。

## 领域事件示例
`course.assignment.created` → task/calendar/notification（事务 outbox 保证至少一次传递；消费者幂等）。`focus.session.completed` → time analytics。`task.deadline.changed` → calendar/notification recalculation。`space.permission.revoked` → invalidate share/sync/AI retrieval。

## AI 工具调用
请求附 `purpose`、`spaceId`、`privacyLevel`、`approvedScopes`、`maxCost`；网关在模型调用前及工具执行前都校验。输出 schema 校验失败可有限重试，重试计费受限。不得把模型生成的工具调用当作用户授权。
