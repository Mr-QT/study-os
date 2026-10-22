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
| P4-05 | 重复事件、提醒、免打扰、每日摘要 | DONE | 92 测试；迁移 0011/0012；日历/偏好 UI |
| P5-01 | 对象存储适配 | DONE/PARTIAL | 本地+S3 适配器、配置校验；S3 未做 MinIO 集成 |
| P5-02 | 目标、习惯、成就与成长档案 | DONE | 97 测试 + 14 E2E；迁移 0013；成长面板 |
| P5-03 | CSV 迁移中心 | DONE | 106 测试 + 15 E2E；迁移 0014；预览/回滚/原件 |
| P5-04 | 多模态（OCR / 音频转写，本地） | DONE | `/media/ocr`、`/media/transcribe`、媒体面板；真实 OCR/Whisper 冒烟 |
| P5-05 | 作品集页面 | DONE | `/spaces/:id/portfolio` + 导出；16 E2E |
| P6-01 | 邀请、成员角色与空间评论 | DONE | 118 测试；迁移 0015；协作面板 |
| P6-02 | 插件 SDK / Webhook / 第三方连接器 | TODO | 后续 |
| P7-01 | 指标、备份/恢复与运维文档 | DONE | `/metrics`、`pnpm backup/restore`、临时库恢复验证 |
| P7-02 | 发布渠道、升级中心、性能与恢复演练 | TODO | 后续 |
| P5 | 多模态/迁移/成长/作品集 | TODO | 后续阶段 |

状态限定：TODO / IN_PROGRESS / BLOCKED / PARTIAL / DONE（DONE 需证据）。
