# 阶段 6：插件平台与轻量协作 — Codex 执行提示词

请先读取 `AGENTS.md`、`PROJECT_STATE.md`、`TASKS.md`、`HANDOFF.md`、`docs/ROADMAP.md`、`docs/PRD.md`、`docs/QUALITY-AND-ACCEPTANCE.md`，确认前置阶段已被用户验收。

## 本阶段目标

实现版本化插件 SDK、权限隔离、开放 API/Webhook、连接器框架；实现个人优先的邀请、分享、评论、任务分配。明确不扩展到企业级实时协作。

## 执行协议

1. 首先把本阶段拆成依赖清晰、每次可独立验收的小里程碑，并给出每个里程碑的真实数据流与验收用例。
2. **一次只实施当前已批准的小里程碑**。需要更换架构、处理敏感数据、调用付费模型、公开部署或破坏性迁移时，先暂停并征得确认。
3. 每个功能完成后实现真实持久化、权限、失败状态、测试；未接通的功能必须明确标记为未实现。
4. 运行相关单元、集成、E2E、离线/安全/视觉测试；报告实际命令与结果，不能虚报。
5. 更新 `PROJECT_STATE.md`、`TASKS.md`、`KNOWN_ISSUES.md`、`HANDOFF.md`，生成可视化验收说明。
6. 交付后停下，等待用户批准下一里程碑。

## 通过标准

满足 `docs/QUALITY-AND-ACCEPTANCE.md` 的 Definition of Done；提供可运行版本、真实跨模块操作、测试与截图证据、已知限制和用户验收清单。
