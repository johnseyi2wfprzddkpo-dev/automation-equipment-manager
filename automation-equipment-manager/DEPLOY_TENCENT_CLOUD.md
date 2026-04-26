# 腾讯云 Ubuntu 22.04 Docker 部署方案

本方案用于在腾讯云 Ubuntu 22.04 服务器上使用 Docker Compose 部署：

- React 前端
- FastAPI 后端
- MySQL 8.0
- Nginx 80 端口反向代理

现有 Vercel + Render 测试部署配置会保留不变。本方案是独立的服务器部署方案。

## 1. 服务器准备

在腾讯云控制台创建 Ubuntu 22.04 云服务器，并在安全组放行：

```text
TCP 22  SSH
TCP 80  HTTP
```

登录服务器：

```bash
ssh ubuntu@你的服务器公网IP
```

安装 Docker 和 Compose 插件：

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

退出 SSH 后重新登录，让 Docker 用户组生效。

## 2. 拉取项目

```bash
git clone https://github.com/你的用户名/automation-equipment-manager.git
cd automation-equipment-manager
```

## 3. 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
nano .env
```

至少修改这些值：

```text
MYSQL_ROOT_PASSWORD=一个强密码
MYSQL_PASSWORD=一个强密码
DATABASE_URL=mysql+pymysql://aem_user:上面的MYSQL_PASSWORD@mysql:3306/aem?charset=utf8mb4
ALLOWED_ORIGINS=http://你的服务器公网IP
ADMIN_USERNAME=admin
ADMIN_PASSWORD=一个强密码
AEM_TOKEN_SECRET=一串长随机密钥
VITE_API_BASE_URL=
```

服务器 Docker 部署时，`VITE_API_BASE_URL` 保持为空。前端生产环境会请求同域 `/api`，Nginx 会转发到 FastAPI 后端。

## 4. 启动服务

```bash
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f nginx
```

浏览器访问：

```text
http://你的服务器公网IP
```

后端健康检查：

```text
http://你的服务器公网IP/api/health
```

## 5. 数据持久化

MySQL 数据使用 Docker named volume 持久化：

```text
mysql_data -> /var/lib/mysql
```

只要不执行删除 volume 的命令，数据库数据会保留。

上传文件使用：

```text
backend_uploads -> /app/data/uploads
```

## 6. 更新部署

```bash
git pull
docker compose up -d --build
```

## 7. 备份 MySQL

备份：

```bash
docker compose exec mysql mysqldump -u root -p aem > aem_backup.sql
```

恢复：

```bash
docker compose exec -T mysql mysql -u root -p aem < aem_backup.sql
```

## 8. 常见问题

如果页面能打开但接口失败：

- 检查 `docker compose ps`
- 检查 `ALLOWED_ORIGINS` 是否是当前访问地址
- 检查 Nginx 是否监听 80 端口
- 访问 `/api/health` 验证后端

如果后端连接 MySQL 失败：

- 确认 `.env` 中 `MYSQL_PASSWORD` 和 `DATABASE_URL` 中的密码一致
- 确认 `DATABASE_URL` 使用容器服务名 `mysql`
- 查看 `docker compose logs -f mysql backend`

## 9. 停止服务

停止容器但保留数据：

```bash
docker compose down
```

停止并删除 MySQL 数据卷会清空数据库，谨慎执行：

```bash
docker compose down -v
```
