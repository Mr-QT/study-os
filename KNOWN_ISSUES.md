# KNOWN_ISSUES — 已知问题与风险

## 环境

- **WSL2 仍未生效**：`RebootPending` 为真、`wsl --status` 显示未安装；Docker Desktop 4.95.0 已安装但引擎无法连接，Compose 未运行。
- 本地数据库使用临时便携版 PostgreSQL 16.14（端口 55432，`%TEMP%`），重启后数据丢失。
- 本机 Python 只有 Microsoft Store 占位符（0 字节），需要 FastAPI 时须安装真实 Python 3.12+。
- Git / Node 在非默认路径（`D:\Git`、`D:\nodejs`），已写入用户 PATH。
- 工作区路径含空格（`D:\Study OS`），当前工具链正常。

## 工程

- 已实现：空间、学期、课程、任务、日历事件（创建/列表/更新/软删除）。
- 未实现：笔记、文件、专注、AI、同步、离线写入、账号体系。
- 空间层级 `parentId` 无自引用外键与环检测。
- 学期只有创建与列表，没有更新/删除接口。
- 日历事件只有创建与列表；任务截止时间尚未自动生成日历事件（引用联动属后续里程碑）。
- 任务更新采用 `version` 乐观并发；冲突返回 409，但前端只做刷新提示，没有合并界面。
- 会话使用签名 Cookie + `SameSite=Lax`，**未实现 CSRF token**。
- IndexedDB 目前只缓存空间，未缓存课程/任务/事件；离线修改与 outbox 属 1.5。
- CORS 允许 `GET/HEAD/POST/PATCH/DELETE/OPTIONS`，仅白名单开发来源。
- axe 自动扫描无违规；未做读屏、键盘人工走查与 200% 缩放。
- `MANIFEST.json` 已与当前工程不匹配（启动包快照，预期）。
- CI 含 PostgreSQL service 与迁移步骤，但尚未在 GitHub Actions 实际运行。

## 数据与安全

- 未处理真实用户数据；隐私分级只有 `spaces.privacy_level` 字段，尚无执行逻辑。
- 端到端加密、云端 AI、全文检索尚未设计。
- 数据库凭据仅通过环境变量传入；开发环境有默认 `SESSION_SECRET`，生产环境强制配置。
