# 阶段 6.1 报告：邀请、成员角色与空间评论

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-22

## 实现

### 数据
- `space_invites`：token（唯一）、role、created_by、expires_at、max_uses、uses
- `comments`：space_id、entity_type（space/task/note/question/exam）、entity_id、body、软删除

### API
- `POST/GET /api/v1/spaces/:id/invites`、`DELETE /api/v1/spaces/:id/invites/:inviteId`（仅 owner）
- `POST /api/v1/invites/:token/join`：校验过期/次数，写入 membership（已加入则幂等返回），递增 uses
- `GET /api/v1/spaces/:id/members`、`PATCH/DELETE /api/v1/spaces/:id/members/:userId`（owner，禁止改动 owner）
- `GET/POST /api/v1/comments`、`DELETE /api/v1/comments/:id`（作者或 owner）
- viewer 仍受 `ensureSpaceAccess(write)` 限制；editor 可写

### Web
- 空间页「协作与讨论」：成员列表、角色调整/移除、邀请码生成/复制/撤销、空间讨论
- 首页「有邀请码？加入一个空间」表单，加入后可直接打开空间

## 测试
- `test/collaboration.integration.test.ts`（5 个）：邀请加入、viewer 写入被拒 + 提升后允许、邀请次数耗尽、评论权限、非 owner 不能看邀请
- `pnpm test`：118 passed（contracts 10、api 108）
- `pnpm test:e2e`：16 passed
- `pnpm lint` / `typecheck` / `build`：通过

## 未完成
- 插件 SDK / Webhook / 第三方连接器
- 评论通知、@ 提醒、任务分配
- 账号体系（目前访客 Cookie）
