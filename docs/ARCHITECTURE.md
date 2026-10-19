# 技术架构基线与关键设计

## 1. 总览

```text
浏览器 / 安装的 PWA（React + Next.js + TypeScript）
  ├─ UI / i18n / Design System / Accessibility
  ├─ IndexedDB 本地读写、离线队列、缓存和冲突界面
  └─ HTTPS / WebSocket（按需）
           ↓
Node.js + TypeScript 核心业务 API（模块化单体）
  ├─ Identity & RBAC/ABAC ├─ Spaces/Courses/Tasks/Calendar
  ├─ Notes/Files/Goals   ├─ Notification/Automation
  ├─ AI Gateway/Policy    ├─ Sync/Events/Plugins
  └─ Audit/Telemetry      └─ Background Workers
           ↓                  ↓
 PostgreSQL + migrations    Object Storage / local files
           ↓
Python + FastAPI AI/文档服务（仅必要场景：OCR、文档解析、复杂分析）
           ↓
云端模型适配器 / Ollama 本地模型（按隐私策略路由）
```

## 2. 仓库建议结构（阶段 0 验证后确定）

```text
apps/web                 # Next.js PWA
apps/api                 # Node.js TS 业务 API
services/ai-worker       # FastAPI（仅按需启用）
packages/ui              # 共享 UI 组件与 tokens
packages/contracts       # Zod/OpenAPI schema 与生成客户端
packages/domain          # 共享领域类型/规则（不可包含服务端秘密）
packages/sync            # 同步协议、冲突策略
packages/plugin-sdk      # 插件接口、权限模型
infra/docker             # Compose、开发与部署配置
tests/e2e                # Playwright
```

## 3. 离线优先与同步

- **本地写入优先**：UI 操作先写 IndexedDB（事务），追加 `outbox` 操作记录与幂等键；界面显示 pending/synced/conflict/error。
- **同步 API**：按设备和空间增量拉取/推送，服务端生成单调变更游标（cursor），以授权范围过滤。
- **冲突策略**：字段级规则按实体明确；不允许无提示的整条 last-write-wins 覆盖。复杂笔记编辑保留版本并提示用户合并；可在后续评估 CRDT，但不预设全系统 CRDT。
- **引用与去重**：实体 ID 稳定、引用跨空间检查权限；统计按主实体去重。
- **安全**：服务端鉴权、审计、幂等处理；断线、重复提交、顺序颠倒、时钟漂移、删除墓碑均有测试。
- **PWA**：Service Worker 缓存应用壳与明确允许的资源；大文件离线下载需用户选择；后台同步能力按浏览器限制降级。
- **本地访客**：不要求登录；未来绑定账号时提供明确合并预览，不静默上传私密内容。

## 4. AI 网关与 Agent

- `AIRequest` 包含用户/空间、目的、数据分类、授权上下文、预算、期望结构、模型偏好；服务端（或可信本地层）先执行隐私与权限判定。
- 模型适配器支持 OpenAI、Anthropic Claude、Google Gemini、DeepSeek、OpenAI-compatible、自托管 Ollama；**配置能力不代表默认内置凭据**。
- 路由按隐私等级→授权→模型可用性→任务能力→成本/延迟选择。私密空间默认仅本地；无本地模型时提示而非静默发送云端。
- Agent 角色：规划、导师、知识、考试、分析及编排器；先实现单网关 + 角色配置，不盲目部署独立 Agent 微服务。
- 所有工具调用使用 allowlist、参数 schema、服务端权限校验、审批门、幂等键、审计与限额。
- RAG 文档片段保留 `source_id/page/offset/version`；外部文本当作数据，防提示注入；无法证实则表达不确定性。
- AI 记忆分短期、长期、空间级；推断与事实分开；可查看/编辑/删除/禁用。
- 成本按模型/Agent/空间归集，预估与账单区分；预算超限停止或请求批准，防循环重试。

## 5. 自动化

规则 = Trigger + Conditions + Actions + Policy。事件总线先在模块化单体内实现；持久化队列负责定时任务与重试。提供 dry-run、审批、幂等、最大深度、次数/费用上限、冷却期、kill switch、审计。AI 生成规则仅生成草案，用户确认后启用。

## 6. 插件

采用版本化 manifest、能力声明、授权范围、安装/禁用/卸载生命周期、SDK 和事件接口。第三方插件必须隔离执行并由宿主校验 API 权限；不可信插件不得直接运行在高权限主进程。早期先交付接口与内部插件示例，后期开放第三方插件执行。

## 7. 技术风险与阶段 0 待验证

- Next.js 版本/路由、Node.js LTS、包管理器、ORM、队列、身份提供方、IndexedDB 封装、全文/向量检索方案均需小型 spike 和 ADR；不凭空锁死版本。
- Windows + Docker Desktop + WSL2 文件系统性能与开发体验需实测。
- **端到端加密与云端索引/AI**：真正 E2EE 的服务器无法直接读取明文；如需要云端处理必须由客户端明确解密/授权发送，或选用非 E2EE 的加密托管模式并告知用户。
- 外部日历、云盘和推送服务需实际凭据、权限和服务端调度；未配置时应显示清晰降级。
