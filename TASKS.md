# TASKS — 任务看板

| ID | 任务 | 状态 | 验收证据 |
|---|---|---|---|
| P0 | 阶段 0 工程基线 | DONE/PARTIAL | 环境、monorepo、API/DB；CI 未远端运行 |
| P1 | 基础平台与核心闭环 | DONE | 49 测试 + 11 E2E |
| P1-06 | 冲突合并 UI | PARTIAL | 409 自动按最新版本重试；无字段级 diff |
| P2 | 题库/考试/复习、RAG、PDF | DONE | 61 测试 + 12 E2E |
| P3 | AI 记忆、分析、导师、多 Agent、计划 | DONE | 69 测试 |
| P4-01 | 规则引擎、运行记录、站内通知 | DONE | 74 测试；迁移 0010 |
| P4-02 | worker、focus/exam 事件、延迟/去重 | DONE | 78 测试；worker 冒烟 |
| P4-03 | 自然语言规则草案 | DONE | API + Web 生成/预览/保存 + 测试 |
| P4-04 | 邮件/PWA 投递 | BLOCKED | 需要 SMTP/推送凭据 |
| P5-01 | 对象存储适配 | DONE/PARTIAL | 本地+S3 适配器、配置校验；S3 未做 MinIO 集成 |
| P5 | 多模态/迁移/成长/作品集 | TODO | 后续阶段 |

状态限定：TODO / IN_PROGRESS / BLOCKED / PARTIAL / DONE（DONE 需证据）。
