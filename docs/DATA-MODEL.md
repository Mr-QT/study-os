# 核心数据模型与迁移约束

## 核心实体（初始逻辑模型）

| 实体 | 核心字段（示例） | 关系与约束 |
|---|---|---|
| User | id, locale, timezone, settings | 可拥有多个空间；访客使用 local identity |
| Device | id, user_id, last_seen, sync_cursor | 设备撤销后同步 token 失效 |
| Space | id, owner_id, parent_id, privacy_level, sync_policy | 层级无环，默认私有 |
| Membership | space_id, user_id, role, invited_by | 唯一成员关系；RBAC + 资源级授权 |
| Term/Course | id, space_id, term_id, schedule_rule, syllabus | 课程属于空间；支持单双周例外 |
| Task | id, space_id, course_id?, status, priority, due_at, estimate | 主记录唯一；子任务/依赖关系无环 |
| TaskLink | task_id, target_type, target_id | 跨模块引用而非复制任务 |
| CalendarEvent | id, source_type, source_id, start, end, timezone, locked | 外部同步与内部来源可追踪 |
| Note | id, space_id, content, format, version, source_type | 原文版本不可静默覆盖 |
| FileAsset | id, hash, mime, storage_key, owner, lifecycle_state | 引用计数不能代替权限检查 |
| NoteFileLink | note_id, asset_id, anchor | 删除文件前做引用影响分析 |
| Exam/Question/Attempt | id, course_id, rubric, score, evidence | AI 主观评分有 provenance |
| FocusSession | id, task_id?, started_at, ended_at, duration | 时长基于事件记录，防重复计数 |
| Goal/Milestone | id, space_id, parent_id, target, status | 目标可关联任务与学习记录 |
| LearningEvidence | id, user_id, concept_id, source_id, confidence | 掌握度推断与事实分离 |
| Memory | id, scope, type, content, source_ref, confidence, expires_at | 可关闭、修正、删除，空间隔离 |
| AIInvocation | id, provider, model, tokens, estimated_cost, policy_result | 不记录原始密钥或默认存全文 |
| AutomationRule/Run | id, trigger, conditions, actions, budget, status | 幂等、审批与审计记录 |
| Notification | id, channel, schedule_at, status, dedupe_key | 可追踪投递与重试 |
| PluginGrant | plugin_id, user_id, scope, capabilities | 默认拒绝，显式授权 |
| SyncChange/Outbox | id, device_id, entity, operation, version, cursor | 墓碑、冲突、幂等与权限 |
| AuditEvent | actor, action, target, outcome, timestamp | 敏感字段脱敏，保留期可配置 |

## 设计约束

- 所有持久化实体采用稳定 ID、`created_at`、`updated_at`、必要时 `deleted_at`（墓碑）与版本号。
- 时间数据库统一存 UTC + 原始时区/重复规则；前端按用户时区显示；单双周课表保存学期锚点。
- 数据迁移必须有编号、可重复测试、前置备份与后置校验；破坏性迁移需要用户确认。
- 空间级权限与隐私策略应覆盖文件、索引、嵌入、AI 记忆、缓存和导出，不仅覆盖主表。
- 采用引用关系支持全局聚合与去重；数据删除前计算依赖图与影响范围。
- 具体 SQL/ORM schema 在阶段 0/1 根据技术验证落地，不将此逻辑模型误认为已实施的数据库结构。
