# 里程碑 1.4 / 1.5 报告（1.5 部分完成）

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-20

## 1.4 实现（AI 基础）

- 数据：`ai_invocations`（provider/model/字符数/估算成本/状态/错误码）
- 网关：`apps/api/src/ai/provider.ts`（OpenAI 兼容 + Ollama，30s 超时）、`apps/api/src/ai/usage.ts`（月度成本/调用数）
- 路由：`apps/api/src/routes/ai.ts`
  - `GET /api/v1/ai/status`、`GET /api/v1/ai/usage`、`POST /api/v1/ai/requests`
  - 默认关闭；无 key 视为未启用；私密空间仅 Ollama；预算超限 402；调用成功/失败都审计
- Web：`apps/web/components/ai-panel.tsx`（未配置提示、生成建议、预算显示）
- 决策：ADR-0012

## 1.5 实现（同步与统计，部分）

- 数据：`sync_changes` 追加式变更日志（id 作为游标）
- 变更记录：任务/笔记的创建、更新、删除写入日志（`apps/api/src/sync/record.ts`）
- 路由：`apps/api/src/routes/sync.ts`
  - `GET /api/v1/sync/pull?spaceId&cursor&limit` 增量拉取
  - `POST /api/v1/sync/push` 批量补丁，返回 accepted/conflict/rejected，baseVersion 不匹配即冲突
- 统计：`apps/api/src/routes/stats.ts` + `apps/web/components/stats-panel.tsx`
- 决策：ADR-0013

## 未实现（1.5 剩余）

- 冲突合并界面（当前冲突只刷新并提示，不提供逐字段合并）
- 笔记的离线编辑入口（笔记 UI 目前只有创建/删除）
- 变更 payload 下推（当前只给 entityId/version）

## 补充：离线 outbox（后续同一会话完成）

- Dexie `outbox` 表 + `enqueueOperation` / `flushOutbox`；
- 任务状态离线切换会乐观更新并显示「离线更改待同步」；
- 联网后通过 `/api/v1/sync/push` 合并重放，成功后清空队列；
- E2E 覆盖：断网切换 → 入队提示 → 恢复网络自动推送 → 刷新后状态保留。

## 测试结果

| 命令 | 结果 |
|---|---|
| `pnpm lint` | 通过 |
| `pnpm typecheck` | contracts / db / api / web 通过 |
| `pnpm test`（带数据库） | 49 passed（contracts 10、api 39） |
| `pnpm test:e2e`（带数据库） | 10 passed |
| `pnpm build` | 通过 |

新增测试：`apps/api/test/ai-sync.integration.test.ts`（7 个：AI 状态/调用/未配置/隐私/预算、sync push 冲突、pull 游标、统计）。

## 真实业务流程

1. AI 未配置时面板明确提示；配置后（stub 测试）可返回建议并记录用量。
2. 任务创建/更新会出现在同步变更流；游标拉取只返回新变更。
3. 过期 `baseVersion` 的 push 返回 conflict 与当前版本。
4. 统计面板显示课程、任务、完成数、笔记、文件、近 7 天专注分钟。

## 安全与风险

- AI 密钥仅服务端；私密空间拦截云模型；预算硬上限。
- 未用真实提供方验证，成本为估算。
- 同步 push 逐条处理，单条失败不影响其他操作。

## 需要用户确认

1. ADR-0012 / ADR-0013 是否批准。
2. 1.4 是否验收；1.5 是否按“部分完成”验收。
3. 下一步：补齐 outbox/离线重放，还是进入阶段 2（知识与评测）。
4. AI 提供方与预算策略（OpenAI / DeepSeek / Ollama）。

## 用户验收结果

待确认。
