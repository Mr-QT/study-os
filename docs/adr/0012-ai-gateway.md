# ADR-0012：AI 网关（默认关闭、预算与隐私前置）

- 状态：Proposed（已实现，待用户批准）
- 日期：2026-10-20
- 影响范围：AI 调用、密钥、成本、隐私
- 背景与问题：阶段 1.4 需要 AI 基础，但不能在未授权时调用付费模型。产品要求私密空间默认本地模型、预算硬上限、调用可审计。

## 决策与理由

- **默认关闭**：`AI_PROVIDER=disabled`；仅配置 `openai`（含 OpenAI 兼容端点）或 `ollama` 时启用；OpenAI 兼容提供方没有 `AI_API_KEY` 视为未启用。
- 提供方适配器：OpenAI 兼容 `/chat/completions`、Ollama `/api/chat`，30 秒超时。
- 隐私前置：`private_local` 空间只允许 `ollama`；云模型直接返回 `403 PRIVACY_DENIED`，不静默降级。
- 预算：按字符估算 token 与成本，`ai_invocations` 记录每次调用；当月累计超过 `AI_MONTHLY_BUDGET_USD` 返回 `402 BUDGET_EXCEEDED`。
- 审计：成功与失败调用都写 `ai_invocations`（不含 prompt 正文），错误码单独记录。
- 结果只是建议：API 返回文本，不自动写入任务或笔记。

## 安全/隐私/性能/成本影响

- 密钥只在服务端环境变量；浏览器不接触。
- 未做敏感内容脱敏与提示注入防护的深度处理（系统提示要求不虚构；外部文本仍属不可信输入）。
- 成本估算为近似值，真实账单以提供方为准。

## 回退方案

关闭 `AI_PROVIDER` 即可完全停用；数据表保留审计记录。

## 需用户批准：是（批准记录：待补充）
