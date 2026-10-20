# KNOWN_ISSUES — 已知问题与风险

## 环境

- Docker Desktop / WSL2 已可用（WSL 2.7.13、Engine 29.8.2）；PostgreSQL 容器通过 `pnpm db:up` 启动，数据保存在持久卷。
- 当前网络直接访问 `docker.io` 会超时；镜像通过 `docker.m.daocloud.io` 拉取后打了本地 tag。新机器/清理镜像后需配置镜像源或手动拉取。
- Python 只有 Microsoft Store 占位符，需要 FastAPI 时须安装真实 Python 3.12+。
- Git / Node 在非默认路径，已写入用户 PATH。

## 工程

- PDF 查看器用 pdfjs-dist 本地渲染；标注是“点击位置的点标记 + 笔记”，不是文本选中高亮，也没有 OCR。
- 向量检索为 JSON + Node 余弦，最多 5000 chunk；未用 pgvector/HNSW。
- 题库：只有创建/列表/删除，没有编辑 UI、批量导入与单选选项编辑；考试/成绩 UI 已可用。
- 复习算法是简化 SM-2（按用户+题目），未做时区对齐与每日上限。
- 1.5 的客户端 outbox 与离线重放已实现（任务状态）；笔记暂无离线编辑入口，冲突只做刷新提示，**没有逐字段合并 UI**。
- AI 已接 DeepSeek（`deepseek-chat`）并做过一次最小 smoke test；未做长对话、限流、超时重试与真实账单核对。
- AI 成本为字符估算，真实账单以提供方为准；未做敏感内容脱敏与提示注入深度防护。
- 阶段 4：通知只有站内渠道真正投递；email/PWA 未接服务，dispatch 会跳过并计数；没有后台调度 worker（需手动或外部定时调用 `/notifications/dispatch`）；规则仅支持 task.completed/focus.completed/exam.submitted 三个触发点。
- 自动化动作只有 create_notification 与 create_task，无自然语言规则与审批流。
- 学习分析只覆盖当前空间；专注分钟按 UTC 记录。
- 笔记无编辑 UI/搜索/双链；专注无暂停与任务选择 UI。
- 文件仅本地磁盘、单实例，无病毒扫描、配额、版本。
- 任务/笔记的 409 冲突只做刷新提示，无合并界面。
- 学期只有创建/列表；日历事件只有创建/列表；任务截止时间未自动生成事件。
- 会话使用签名 Cookie + `SameSite=Lax`，**未实现 CSRF token**。
- 空间层级 `parentId` 无自引用外键与环检测。
- axe 自动扫描无违规；未做读屏/键盘人工走查与 200% 缩放。
- CI 尚未在 GitHub Actions 实际运行。

## 数据与安全

- 未处理真实用户数据；隐私分级只有字段，尚无执行逻辑（AI 网关已做 private_local 拦截）。
- 上传文件 MIME 由客户端声明，仅做白名单；无内容深度检测。
- 端到端加密、云端 AI 的完整隐私流程尚未设计。
