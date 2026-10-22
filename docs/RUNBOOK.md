# 运维 Runbook（阶段 7.1）

本文件是 `OPERATIONS.md` 的落地命令版。

## 健康与指标

- `GET /health`：进程与数据库连通性，适合容器 healthcheck。
- `GET /metrics`：Prometheus 文本，含 `studyos_up`、`studyos_database_up`、uptime、RSS 与各表行数（聚合，无用户内容）。
- `pnpm worker`：每 30 秒发送到期站内通知并检查每日摘要；需单独进程/进程守护。

## 备份

```powershell
pnpm backup
# BACKUP=backups\studyos-YYYYMMDD-HHmmss.dump SIZE=...
```

- `pg_dump -Fc` 后通过 `docker cp` 落到 `backups/`（已 gitignore），默认保留最近 7 份。
- 已演练：备份可导入临时库并还原 33 张表。

## 恢复

```powershell
pnpm restore -File backups\studyos-YYYYMMDD-HHmmss.dump
# 输入 RESTORE 确认
```

- 会终止 `studyos` 现有连接，再 `pg_restore --clean --if-exists`。
- 建议先停 API/worker；恢复后重启并检查 `/health`。
- 恢复前先再备份一次当前库。

## 升级

1. `pnpm install`
2. `pnpm db:migrate`
3. `pnpm build`
4. 重启 API / worker / Web
5. 检查 `/health` 与 `/metrics`

## 部署注意

- `SESSION_SECRET` 生产必须 ≥16 字符；`secureCookies` 在生产开启，需要 HTTPS。
- `DATABASE_URL`、`AI_*`、`S3_*` 通过环境变量注入，不提交仓库。
- 上传目录、`.cache`、`backups/` 需要持久化。
