# KNOWN_ISSUES — 已知问题与风险

## 环境

- **WSL2 仍未生效**：`RebootPending` 为真、`wsl --status` 显示未安装；Docker Desktop 4.95.0 已安装但引擎无法连接，Compose 未运行。
- 本地数据库目前依赖临时便携版 PostgreSQL 16.14（端口 55432）；它不是常驻服务，重启后需重新启动。
- 本机 Python 只有 Microsoft Store 占位符（0 字节），需要 FastAPI 时须安装真实 Python 3.12+。
- Git / Node 在非默认路径（`D:\Git`、`D:\nodejs`），已写入用户 PATH。
- 工作区路径含空格（`D:\Study OS`），当前工具链正常。

## 工程

- 里程碑 1.1 之外的功能均未实现：课程、任务、日历、笔记、文件、专注、AI、同步。
- 空间层级 `parentId` 有字段但无自引用外键与环检测；父空间权限在应用层校验。
- 访客身份绑定浏览器 Cookie；清除 Cookie 即丢失身份，尚不能升级为账号。
- 会话使用签名 Cookie + `SameSite=Lax`，**未实现 CSRF token**；后续账号体系必须补强。
- IndexedDB 目前是只读缓存；离线修改与 outbox 属里程碑 1.5，未实现。
- 错误结构已改为 `docs/API-CONTRACTS.md` 约定的扁平 envelope；旧客户端需同步。
- axe 自动扫描无违规；未做读屏、键盘人工走查与 200% 缩放验证。
- `MANIFEST.json` 是启动包初始快照，已与当前工程不匹配，属预期。
- CI 配置包含 PostgreSQL service 与迁移步骤，但尚未在 GitHub Actions 上实际运行。

## 数据与安全

- 未处理真实用户数据；隐私分级只落在 `spaces.privacy_level` 字段，尚无执行逻辑。
- 端到端加密、云端 AI、全文检索尚未设计。
- 数据库凭据仅通过环境变量传入；开发环境有默认 `SESSION_SECRET`，生产环境强制要求配置。
