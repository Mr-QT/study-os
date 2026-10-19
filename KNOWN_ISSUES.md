# KNOWN_ISSUES — 已知问题与风险

## 环境

- **WSL2 已启用但需要重启**：Docker Desktop 4.95.0 已安装，`com.docker.service` 未启动，`docker version` 无法连接引擎；`infra/docker/docker-compose.yml` 从未运行，PostgreSQL 集成未验证。
- 本机 Python 只有 Microsoft Store 占位符（0 字节），阶段 1 需要 FastAPI 时须安装真实 Python 3.12+。
- Git / Node 安装在非默认路径（`D:\Git`、`D:\nodejs`），已写入用户 PATH；新终端才生效。
- 工作区路径含空格（`D:\Study OS`），当前工具链均正常；部分旧脚本可能需引号。

## 工程

- 业务功能全部未实现：学习空间、课程、任务、日历、笔记、文件、AI、同步等均为 `PLANNED`。
- 无认证、无持久化业务数据、无数据库 schema/迁移。
- ORM、身份、IndexedDB、检索、队列、对象存储、插件沙箱均未选型（ADR-0006）。
- 无障碍仅做基础（`lang`、跳过导航、`aria-live`、`prefers-reduced-motion`），未执行 axe 或完整 WCAG 2.2 AA 审计。
- `.env` 不会自动加载：API 使用默认值或进程环境变量；`docker compose` 会自动读取根目录 `.env`。
- `MANIFEST.json` 是启动包初始快照；新增工程文件后不再匹配，属预期行为。
- CI 配置已写好，但只在本地跑过，尚未在 GitHub Actions 上实际执行。

## 数据与安全

- 端到端加密、云端 AI、全文检索存在明确技术取舍，尚未设计（见安全与架构文档）。
- 未处理任何真实用户数据；当前无隐私分级实现。
