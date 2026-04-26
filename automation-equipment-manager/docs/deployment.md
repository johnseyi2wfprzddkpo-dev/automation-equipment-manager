# GitHub + Render + Vercel 部署指南

本项目包含 React 前端、FastAPI 后端和 SQLite 数据库。GitHub 用来托管源码，Vercel 部署前端，Render 部署后端。

## 1. 上传到 GitHub

在项目根目录执行：

```bash
git init
git add .
git commit -m "initial release"
git branch -M main
git remote add origin https://github.com/你的用户名/automation-equipment-manager.git
git push -u origin main
```

## 2. 部署后端到 Render

在 Render 中选择 `New` -> `Blueprint`，连接 GitHub 仓库。Render 会读取项目根目录的 `render.yaml`。

创建服务时需要配置这些环境变量：

```text
ALLOWED_ORIGINS=https://你的前端域名
ADMIN_USERNAME=admin
ADMIN_PASSWORD=一个强密码
AEM_TOKEN_SECRET=一串随机密钥
```

`DATA_DIR=/var/data` 已在 `render.yaml` 中配置，并挂载了 1GB 持久化磁盘。SQLite 数据库和上传文件会保存在这个目录下。

部署完成后，记录后端地址，例如：

```text
https://automation-equipment-manager-api.onrender.com
```

健康检查地址：

```text
https://automation-equipment-manager-api.onrender.com/api/health
```

## 3. 部署前端到 Vercel

在 Vercel 中导入同一个 GitHub 仓库，项目配置：

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

添加环境变量：

```text
VITE_API_BASE_URL=https://你的后端域名
```

重新部署后，Vercel 会生成前端访问地址，例如：

```text
https://automation-equipment-manager.vercel.app
```

把这个前端地址再回填到 Render 的 `ALLOWED_ORIGINS`，然后重新部署后端。

## 4. 上线检查

1. 打开后端 `/api/health`，确认返回 `{"status":"ok"}`。
2. 打开前端地址，使用 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 登录。
3. 测试设备列表、保养提醒、利用率统计、Excel 导入导出。
4. 如果接口报跨域错误，检查 Render 的 `ALLOWED_ORIGINS` 是否和 Vercel 域名完全一致。

## 5. 注意事项

- 不要把 `.env`、数据库文件、上传文件、`node_modules` 提交到 GitHub。
- SQLite 适合演示和轻量使用；多人长期使用建议后续迁移到 PostgreSQL。
- 公开访问前必须修改默认管理员密码。
- Render 免费服务可能会休眠，首次访问会慢一些。
