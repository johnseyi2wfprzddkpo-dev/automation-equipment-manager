# 华登集团自动化设备管理系统

本项目是一个适合华登集团工厂内部使用的本地轻量 Web 系统，用于管理自动化设备台账、状态、位置、外发、生产货号、维修和保养记录。

当前已完成：

- 阶段 1：项目骨架
- 阶段 2：设备台账模块
- 阶段 3：状态和位置模块
- 阶段 4：外发和生产模块
- 阶段 5：维修、保养和首页看板
- 扩展：登录权限

## 技术栈

- 前端：React + Vite
- 后端：Python FastAPI
- 数据库：SQLite

## 目录结构

```text
automation-equipment-manager/
├── backend/
│   ├── app/
│   ├── data/
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   └── README.md
├── docs/
├── text.md
└── README.md
```

## 后端启动

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

后端默认地址：

```text
http://127.0.0.1:8000
```

接口文档地址：

```text
http://127.0.0.1:8000/docs
```

健康检查：

```text
GET http://127.0.0.1:8000/api/health
```

正常返回：

```json
{"status":"ok"}
```

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173
```

## 公网部署

如果需要让不在同一局域网的人访问，项目必须部署到一台带公网 IP 的服务器上，并建议绑定域名。仅在自己电脑上启动服务，外网用户无法稳定访问。

推荐部署结构：

```text
公网域名
├── /        前端静态文件
├── /api     反向代理到 FastAPI 后端 8000 端口
└── /uploads 反向代理到 FastAPI 上传文件服务
```

### 1. 后端生产启动

服务器上进入后端目录，安装依赖后启动：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ALLOWED_ORIGINS=https://your-domain.com
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

如果前端和后端使用同一个域名，并通过 Nginx 把 `/api` 和 `/uploads` 转发到后端，`ALLOWED_ORIGINS` 可以保留为该域名。

### 2. 前端生产构建

如果前端和后端是同一个域名：

```bash
cd frontend
npm install
npm run build
```

如果前端和后端是不同域名，构建前指定后端公网地址：

```bash
cd frontend
npm install
VITE_API_BASE_URL=https://api.your-domain.com npm run build
```

构建产物在：

```text
frontend/dist
```

把 `frontend/dist` 作为网站静态目录发布即可。

### 3. Nginx 反向代理示例

同域名部署时可使用类似配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/automation-equipment-manager/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

正式对外使用时建议再配置 HTTPS，并把默认管理员密码改掉。

```text
http://127.0.0.1:5173
```

## 阶段 1 验证方法

1. 启动后端，访问 `http://127.0.0.1:8000/api/health`。
2. 启动前端，访问 `http://127.0.0.1:5173`。
3. 首页应显示“华登集团自动化设备管理系统”和菜单：首页看板、设备台账、外发管理、维修异常、保养记录。
4. 如果后端已启动，首页右上角应显示“后端正常”。

## 阶段 2 验证方法

后端接口：

```bash
curl http://127.0.0.1:8000/api/equipment
curl http://127.0.0.1:8000/api/equipment/statuses
```

前端页面：

1. 打开 `http://127.0.0.1:5173`。
2. 点击左侧“设备台账”。
3. 点击“新增设备”，填写设备编号、名称、类型和状态后保存。
4. 在列表中点击“详情”查看设备资料。
5. 点击“编辑”修改设备信息。
6. 点击“停用”会软删除设备，列表不再显示该设备。

## 阶段 3 验证方法

后端接口：

```bash
curl http://127.0.0.1:8000/api/equipment/2/status-logs
curl http://127.0.0.1:8000/api/equipment/2/location-logs
```

前端页面：

1. 打开 `http://127.0.0.1:5173`。
2. 进入“设备台账”，点击某台设备的“详情”。
3. 在“更新状态”表单中选择新状态并保存。
4. 在“更新位置”表单中填写新位置并保存。
5. 页面下方应能看到状态变更历史和位置变更历史。

## 阶段 4 验证方法

前端页面：

1. 打开 `http://127.0.0.1:5173`。
2. 进入“设备台账”，点击某台设备的“详情”。
3. 使用“登记外发”表单新增外发记录，设备状态会自动变为“外发中”。
4. 进入“外发管理”，未返回记录可在列表中登记返回。
5. 回到设备详情页，使用“登记生产”表单新增生产记录，设备当前生产货号会同步更新。
6. 设备详情页下方可查看外发历史和生产历史。

后端接口：

```bash
curl http://127.0.0.1:8000/api/outsource
curl http://127.0.0.1:8000/api/production
```

## 阶段 5 验证方法

前端页面：

1. 打开 `http://127.0.0.1:5173`。
2. 进入“维修异常”，选择设备并新增维修异常记录。
3. 进入“保养记录”，选择设备并新增保养记录。
4. 回到“首页看板”，应能看到设备数量、状态数量、外发超期数量和最近状态变更。
5. 进入设备详情页，下方可查看维修历史和保养历史。

后端接口：

```bash
curl http://127.0.0.1:8000/api/repair
curl http://127.0.0.1:8000/api/maintenance
curl http://127.0.0.1:8000/api/dashboard/summary
```

## 登录权限

首次启动后，系统会自动创建默认管理员：

```text
用户名：admin
密码：admin123
```

前端打开 `http://127.0.0.1:5173` 后会先进入登录页。管理员登录后可在左侧看到“用户权限”，用于创建其他角色账号。

当前角色：

| 角色 | 权限 |
| --- | --- |
| 管理员 | 全部功能和用户管理 |
| 技术员 | 状态、位置、外发、生产、维修、保养操作 |
| 生产人员 | 生产记录、维修异常反馈 |
| 领导 | 查看数据和看板 |

后端登录接口：

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

## 后续阶段

MVP 主流程已经完成。后续可继续扩展登录权限、二维码扫码、Excel 导入导出、图片上传、保养提醒和设备利用率统计。
