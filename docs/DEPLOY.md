# 部署到公网（Render + GitHub）

目标：老师点开一个 `https://...onrender.com` 网址即可使用，不需要安装任何环境。

## 架构

- 一个 Docker 容器：Nginx（公网入口）→ Next.js（3000）+ Fastify API（4000）
- Render 托管 Postgres（`DATABASE_URL` 自动注入）
- 同源 `/api` 代理，浏览器 Cookie 不需要跨域
- `render.yaml` 定义 Web 服务 + 数据库，可一键 Blueprint 部署

## 一次性准备

1. **GitHub 账号**（免费）：https://github.com/signup
2. 新建一个 **空仓库**（Public 或 Private 均可），名字如 `study-os`，不要勾选 README。
3. **Render 账号**（免费）：https://render.com ，选择 “Sign up with GitHub”。

## 部署

1. Render 控制台 → **New → Blueprint**。
2. 连接 GitHub，选择 `study-os` 仓库。
3. Render 读取 `render.yaml`，创建：
   - `study-os` Web 服务（Docker，Free）
   - `study-os-db` Postgres（Free）
4. 在 Web 服务的 Environment 里填 AI（可选）：
   - `AI_PROVIDER=openai`
   - `AI_BASE_URL=https://api.deepseek.com`
   - `AI_API_KEY=你的新 key`（不要用泄露过的旧 key）
   - `AI_MODEL=deepseek-chat`
   - `AI_MONTHLY_BUDGET_USD=2`
5. 点 **Apply / Deploy**，等待镜像构建（首次约 10–20 分钟）。
6. 打开 Render 给出的 `https://study-os-xxxx.onrender.com`。

## 注意事项

- Render 免费 Web 服务 15 分钟无访问会休眠，老师第一次打开可能需要等 30–60 秒。
- 免费 Postgres 有有效期限制（以 Render 当前政策为准），到期需升级或迁移。
- 容器本地磁盘是临时的：上传文件会随重启丢失；笔记/任务等数据库数据在 Postgres 中保留。
- 当前只有**访客 Cookie 登录**（每个浏览器自动获得独立空间）；邮箱+密码账号是下一步。
- AI 请求按用户月度预算封顶；公开后建议加每日配额与全站上限。
- 不要提交 `.env`；密钥只放 Render 环境变量。

## 本地验证镜像

```powershell
docker build -t study-os:test .
docker run --rm -p 8080:10000 `
  -e DATABASE_URL="postgres://studyos:studyos@host.docker.internal:5432/studyos" `
  -e SESSION_SECRET="local-test-secret-please-change" `
  -e NODE_ENV=production `
  study-os:test
```

打开 http://127.0.0.1:8080 。
