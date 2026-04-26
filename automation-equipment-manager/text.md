# 自动化设备管理系统开发需求文档

> 本文档用于直接提供给 Codex，指导其开发一个本地轻量版的自动化设备管理系统。

---

## 1. 项目名称

自动化设备管理系统

英文项目名建议：

```text
automation-equipment-manager
```

---

## 2. 项目背景

我在工厂自动化部门工作，部门需要管理公司购买和使用的自动化设备。目前设备可能分布在不同厂区、车间、产线，也可能外发到供应商或加工厂进行调试、维修、改造。

现在主要问题是：

1. 不清楚每台设备当前在哪里。
2. 不清楚设备是在生产、待用、调试、维修，还是外发。
3. 不清楚设备当前正在生产什么货号。
4. 不清楚设备由谁负责。
5. 设备外发后容易忘记跟进返回时间。
6. 维修、保养、异常记录比较零散。
7. 领导想看设备情况时，需要人工到处统计。

因此，需要开发一个本地轻量系统，用于管理自动化设备台账、状态、位置、外发、生产货号、维修和保养记录。

---

## 3. 项目目标

开发一个适合小型工厂内部使用的本地轻量 Web 系统，实现以下目标：

1. 建立自动化设备台账。
2. 记录每台设备当前状态。
3. 记录每台设备所在位置。
4. 记录设备是否外发、外发到哪里、预计什么时候回来。
5. 记录设备当前生产货号和产品信息。
6. 记录设备维修异常情况。
7. 记录设备保养情况。
8. 首页展示设备统计看板。
9. 支持后续扩展二维码扫码、Excel 导出、保养提醒、设备利用率统计。

---

## 4. 技术栈要求

本项目采用本地轻量方案，优先保证简单、稳定、容易部署。

### 前端

```text
React + Vite
```

要求：

* 页面简洁清楚，适合工厂内部人员使用。
* 不需要复杂动画。
* 表格、表单、筛选、详情页要清晰。
* 可以使用普通 CSS，也可以使用 Tailwind CSS。
* 如果引入组件库，优先选择简单稳定的组件库。

### 后端

```text
Python FastAPI
```

要求：

* 接口结构清晰。
* 代码简单易维护。
* 使用 Pydantic 做基本数据校验。
* 使用 SQLAlchemy 操作数据库。
* 提供接口文档。

### 数据库

```text
SQLite
```

要求：

* 第一版使用 SQLite，方便本地部署。
* 数据库文件放在 backend/data/app.db。
* 后续需要方便迁移到 MySQL。

### 开发环境

```text
操作系统：Windows
编辑器：VS Code
开发工具：Codex IDE Extension
```

---

## 5. 总体开发原则

请按照以下原则开发：

1. 先完成最小可用版本 MVP，不要一开始做太复杂。
2. 代码要简单、清晰、容易理解。
3. 每完成一个模块，都要保证项目能正常启动。
4. 每个功能都要有基本的测试方法。
5. 不要过度封装。
6. 不要引入太多复杂依赖。
7. 设备编号必须唯一。
8. 设备状态必须使用固定选项。
9. 每次状态变化必须保存历史记录。
10. 每次设备位置变化最好保存历史记录。
11. 删除设备不要直接物理删除，建议做软删除或设置为停用。
12. 所有重要记录都要保存创建时间和更新时间。

---

## 6. 项目目录结构

请按以下目录结构创建项目：

```text
automation-equipment-manager/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   ├── routers/
│   │   │   ├── equipment.py
│   │   │   ├── status.py
│   │   │   ├── location.py
│   │   │   ├── outsource.py
│   │   │   ├── production.py
│   │   │   ├── repair.py
│   │   │   ├── maintenance.py
│   │   │   └── dashboard.py
│   │   └── utils/
│   │       └── enums.py
│   ├── data/
│   │   └── app.db
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EquipmentList.jsx
│   │   │   ├── EquipmentDetail.jsx
│   │   │   ├── EquipmentForm.jsx
│   │   │   ├── OutsourceList.jsx
│   │   │   ├── RepairList.jsx
│   │   │   └── MaintenanceList.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── requirement.md
│   ├── database-design.md
│   ├── api-design.md
│   └── task-list.md
│
├── README.md
└── .gitignore
```

---

## 7. 设备状态固定选项

设备状态必须使用以下固定选项，不允许随意输入其他状态：

```text
生产中
待用
调试中
维修中
保养中
外发中
待验收
停用
报废
```

### 状态说明

| 状态  | 说明               |
| --- | ---------------- |
| 生产中 | 设备正在参与生产         |
| 待用  | 设备正常，但当前没有安排生产   |
| 调试中 | 设备正在调试、试产或优化     |
| 维修中 | 设备出现故障，正在维修      |
| 保养中 | 设备正在做保养          |
| 外发中 | 设备发到供应商、加工厂或其他地方 |
| 待验收 | 新设备或改造设备等待验收     |
| 停用  | 暂时不再使用           |
| 报废  | 已无维修或使用价值        |

---

## 8. 核心数据表设计

## 8.1 设备主表：equipment

用于保存设备基础信息和当前状态。

| 字段名                  | 类型       | 说明      | 是否必填 |
| -------------------- | -------- | ------- | ---- |
| id                   | Integer  | 主键ID    | 是    |
| equipment_code       | String   | 设备编号，唯一 | 是    |
| equipment_name       | String   | 设备名称    | 是    |
| equipment_type       | String   | 设备类型    | 是    |
| brand                | String   | 品牌      | 否    |
| supplier             | String   | 供应商     | 否    |
| purchase_date        | Date     | 购买日期    | 否    |
| purchase_price       | Float    | 购买金额    | 否    |
| current_status       | String   | 当前状态    | 是    |
| current_location     | String   | 当前位置    | 否    |
| current_product_code | String   | 当前生产货号  | 否    |
| manager              | String   | 负责人     | 否    |
| remark               | Text     | 备注      | 否    |
| is_deleted           | Boolean  | 是否删除    | 是    |
| created_at           | DateTime | 创建时间    | 是    |
| updated_at           | DateTime | 更新时间    | 是    |

---

## 8.2 状态变更记录表：equipment_status_log

用于记录设备每一次状态变化。

| 字段名           | 类型       | 说明   |
| ------------- | -------- | ---- |
| id            | Integer  | 主键ID |
| equipment_id  | Integer  | 设备ID |
| old_status    | String   | 原状态  |
| new_status    | String   | 新状态  |
| change_reason | Text     | 变更原因 |
| operator      | String   | 操作人  |
| change_time   | DateTime | 变更时间 |
| remark        | Text     | 备注   |

要求：

* 修改设备状态时，必须同步更新 equipment.current_status。
* 同时新增一条 equipment_status_log 记录。
* 状态值必须来自固定状态选项。

---

## 8.3 位置变更记录表：equipment_location_log

用于记录设备每一次位置变化。

| 字段名               | 类型       | 说明   |
| ----------------- | -------- | ---- |
| id                | Integer  | 主键ID |
| equipment_id      | Integer  | 设备ID |
| old_location      | String   | 原位置  |
| new_location      | String   | 新位置  |
| is_outsource      | Boolean  | 是否外发 |
| outsource_company | String   | 外发单位 |
| contact_person    | String   | 联系人  |
| contact_phone     | String   | 联系电话 |
| move_reason       | Text     | 移动原因 |
| move_time         | DateTime | 移动时间 |
| operator          | String   | 操作人  |
| remark            | Text     | 备注   |

---

## 8.4 外发记录表：equipment_outsource_log

用于记录设备外发和返回情况。

| 字段名                  | 类型       | 说明             |
| -------------------- | -------- | -------------- |
| id                   | Integer  | 主键ID           |
| equipment_id         | Integer  | 设备ID           |
| outsource_company    | String   | 外发单位           |
| contact_person       | String   | 联系人            |
| contact_phone        | String   | 联系电话           |
| outsource_reason     | Text     | 外发原因           |
| outsource_date       | Date     | 外发日期           |
| expected_return_date | Date     | 预计返回日期         |
| actual_return_date   | Date     | 实际返回日期         |
| status               | String   | 外发状态：外发中 / 已返回 |
| operator             | String   | 操作人            |
| remark               | Text     | 备注             |
| created_at           | DateTime | 创建时间           |
| updated_at           | DateTime | 更新时间           |

要求：

* 登记外发时，设备状态自动改为“外发中”。
* 设备返回时，填写实际返回日期。
* 设备返回后，允许选择新状态：待用、调试中、生产中。
* 外发列表要判断是否超期：当前日期 > 预计返回日期 且 实际返回日期为空。

---

## 8.5 生产记录表：equipment_production_log

用于记录设备生产货号和产品情况。

| 字段名               | 类型       | 说明   |
| ----------------- | -------- | ---- |
| id                | Integer  | 主键ID |
| equipment_id      | Integer  | 设备ID |
| product_code      | String   | 生产货号 |
| product_name      | String   | 产品名称 |
| department        | String   | 使用部门 |
| start_time        | DateTime | 开始时间 |
| end_time          | DateTime | 结束时间 |
| operator          | String   | 操作人员 |
| output_qty        | Integer  | 产量   |
| production_status | String   | 生产状态 |
| remark            | Text     | 备注   |
| created_at        | DateTime | 创建时间 |

要求：

* 当设备开始生产时，设备状态可设置为“生产中”。
* 同步更新 equipment.current_product_code。
* 设备详情页显示生产历史。

---

## 8.6 维修异常记录表：equipment_repair_log

用于记录设备故障、异常和维修处理过程。

| 字段名               | 类型       | 说明    |
| ----------------- | -------- | ----- |
| id                | Integer  | 主键ID  |
| equipment_id      | Integer  | 设备ID  |
| issue_time        | DateTime | 异常时间  |
| issue_description | Text     | 异常描述  |
| issue_level       | String   | 异常等级  |
| reporter          | String   | 反馈人   |
| handler           | String   | 处理人   |
| repair_status     | String   | 处理状态  |
| repair_method     | Text     | 处理方法  |
| finish_time       | DateTime | 完成时间  |
| downtime_minutes  | Integer  | 停机分钟数 |
| remark            | Text     | 备注    |
| created_at        | DateTime | 创建时间  |
| updated_at        | DateTime | 更新时间  |

异常等级固定选项：

```text
轻微
一般
严重
重大
```

处理状态固定选项：

```text
待处理
处理中
已解决
需外发
```

---

## 8.7 保养记录表：equipment_maintenance_log

用于记录设备保养计划和实际保养结果。

| 字段名                 | 类型       | 说明     |
| ------------------- | -------- | ------ |
| id                  | Integer  | 主键ID   |
| equipment_id        | Integer  | 设备ID   |
| maintenance_type    | String   | 保养类型   |
| maintenance_content | Text     | 保养内容   |
| plan_date           | Date     | 计划保养日期 |
| actual_date         | Date     | 实际保养日期 |
| maintainer          | String   | 保养人    |
| result              | String   | 保养结果   |
| next_date           | Date     | 下次保养日期 |
| remark              | Text     | 备注     |
| created_at          | DateTime | 创建时间   |
| updated_at          | DateTime | 更新时间   |

保养类型固定选项：

```text
日常保养
周保养
月保养
年度保养
临时保养
```

---

## 9. 后端 API 设计

接口前缀统一使用：

```text
/api
```

---

## 9.1 设备台账接口

| 方法     | 地址                  | 说明         |
| ------ | ------------------- | ---------- |
| GET    | /api/equipment      | 获取设备列表     |
| POST   | /api/equipment      | 新增设备       |
| GET    | /api/equipment/{id} | 获取设备详情     |
| PUT    | /api/equipment/{id} | 编辑设备       |
| DELETE | /api/equipment/{id} | 删除设备，建议软删除 |

设备列表支持筛选参数：

```text
status
equipment_type
location
manager
keyword
```

---

## 9.2 状态管理接口

| 方法   | 地址                              | 说明       |
| ---- | ------------------------------- | -------- |
| POST | /api/equipment/{id}/status      | 更新设备状态   |
| GET  | /api/equipment/{id}/status-logs | 获取设备状态历史 |

更新状态请求体示例：

```json
{
  "new_status": "生产中",
  "change_reason": "设备调试完成，投入生产",
  "operator": "张三",
  "remark": "运行稳定"
}
```

---

## 9.3 位置管理接口

| 方法   | 地址                                | 说明       |
| ---- | --------------------------------- | -------- |
| POST | /api/equipment/{id}/location      | 更新设备位置   |
| GET  | /api/equipment/{id}/location-logs | 获取设备位置历史 |

---

## 9.4 外发管理接口

| 方法   | 地址                                 | 说明       |
| ---- | ---------------------------------- | -------- |
| GET  | /api/outsource                     | 获取外发记录列表 |
| POST | /api/equipment/{id}/outsource      | 登记设备外发   |
| PUT  | /api/outsource/{id}/return         | 登记设备返回   |
| GET  | /api/equipment/{id}/outsource-logs | 获取设备外发历史 |

登记外发请求体示例：

```json
{
  "outsource_company": "德立宏供应商",
  "contact_person": "王工",
  "contact_phone": "13800000000",
  "outsource_reason": "程序调试和夹具优化",
  "outsource_date": "2026-04-24",
  "expected_return_date": "2026-04-30",
  "operator": "张三",
  "remark": "外发前已拍照确认"
}
```

---

## 9.5 生产记录接口

| 方法   | 地址                                  | 说明       |
| ---- | ----------------------------------- | -------- |
| GET  | /api/production                     | 获取生产记录列表 |
| POST | /api/equipment/{id}/production      | 新增生产记录   |
| PUT  | /api/production/{id}                | 编辑生产记录   |
| GET  | /api/equipment/{id}/production-logs | 获取设备生产历史 |

---

## 9.6 维修异常接口

| 方法   | 地址                              | 说明       |
| ---- | ------------------------------- | -------- |
| GET  | /api/repair                     | 获取维修异常列表 |
| POST | /api/equipment/{id}/repair      | 新增维修异常   |
| PUT  | /api/repair/{id}                | 更新维修处理情况 |
| GET  | /api/equipment/{id}/repair-logs | 获取设备维修历史 |

---

## 9.7 保养接口

| 方法   | 地址                                   | 说明       |
| ---- | ------------------------------------ | -------- |
| GET  | /api/maintenance                     | 获取保养记录列表 |
| POST | /api/equipment/{id}/maintenance      | 新增保养记录   |
| PUT  | /api/maintenance/{id}                | 编辑保养记录   |
| GET  | /api/equipment/{id}/maintenance-logs | 获取设备保养历史 |

---

## 9.8 首页看板接口

| 方法  | 地址                     | 说明       |
| --- | ---------------------- | -------- |
| GET | /api/dashboard/summary | 获取首页统计数据 |

返回内容包括：

```json
{
  "total_equipment": 28,
  "production_count": 12,
  "idle_count": 6,
  "debugging_count": 4,
  "repair_count": 2,
  "outsource_count": 3,
  "stopped_count": 1,
  "overdue_outsource_count": 1,
  "recent_status_logs": []
}
```

---

## 10. 前端页面设计

## 10.1 页面菜单

系统左侧或顶部菜单包括：

```text
首页看板
设备台账
外发管理
维修异常
保养记录
```

第一版可以先不做登录权限。

---

## 10.2 首页看板 Dashboard

显示内容：

1. 设备总数
2. 生产中数量
3. 待用数量
4. 调试中数量
5. 维修中数量
6. 外发中数量
7. 外发超期数量
8. 最近 10 条状态变更记录

页面要求：

* 使用卡片展示数字。
* 红色或醒目样式显示维修中和外发超期。
* 页面简单明了，适合领导查看。

---

## 10.3 设备台账列表 EquipmentList

显示字段：

| 设备编号 | 设备名称 | 类型 | 状态 | 位置 | 当前货号 | 负责人 | 更新时间 | 操作 |
|---|---|---|---|---|---|---|---|

功能：

1. 新增设备。
2. 编辑设备。
3. 查看详情。
4. 删除或停用设备。
5. 按状态筛选。
6. 按类型筛选。
7. 按负责人筛选。
8. 关键词搜索。

---

## 10.4 设备详情页 EquipmentDetail

显示内容：

1. 设备基本资料。
2. 当前状态。
3. 当前所在位置。
4. 当前生产货号。
5. 状态变更历史。
6. 位置变更历史。
7. 外发历史。
8. 生产历史。
9. 维修历史。
10. 保养历史。

页面按钮：

```text
编辑设备
更新状态
更新位置
登记外发
登记生产
新增维修记录
新增保养记录
```

---

## 10.5 外发管理页 OutsourceList

显示字段：

| 设备编号 | 设备名称 | 外发单位 | 外发原因 | 外发日期 | 预计返回 | 实际返回 | 状态 | 是否超期 | 操作 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | -- | ---- | -- |

要求：

* 未返回且超过预计返回日期的记录，要显示“已超期”。
* 支持点击“登记返回”。

---

## 10.6 维修异常页 RepairList

显示字段：

| 设备编号 | 设备名称 | 异常描述 | 异常等级 | 反馈人 | 处理人 | 处理状态 | 异常时间 | 操作 |
| ---- | ---- | ---- | ---- | --- | --- | ---- | ---- | -- |

---

## 10.7 保养记录页 MaintenanceList

显示字段：

| 设备编号 | 设备名称 | 保养类型 | 计划日期 | 实际日期 | 保养人 | 结果 | 下次保养 | 操作 |
| ---- | ---- | ---- | ---- | ---- | --- | -- | ---- | -- |

---

## 11. MVP 第一版必须完成的功能

第一版只做最核心功能，不做复杂权限和高级报表。

### 必须完成

1. 后端 FastAPI 项目可启动。
2. 前端 React 项目可启动。
3. SQLite 数据库可自动创建表。
4. 设备新增、编辑、删除、列表、详情。
5. 设备状态更新和状态历史记录。
6. 设备位置更新和位置历史记录。
7. 外发登记、返回登记、外发超期判断。
8. 当前生产货号记录。
9. 首页看板统计。
10. README 中写清楚启动方式。

### 暂时不做

1. 登录权限。
2. 图片上传。
3. 二维码扫码。
4. Excel 导入导出。
5. PLC 数据采集。
6. 自动提醒推送。
7. 复杂图表。

---

## 12. 分阶段开发任务

## 阶段 1：项目骨架

任务：

1. 创建前端和后端目录。
2. 后端配置 FastAPI。
3. 后端配置 SQLite 和 SQLAlchemy。
4. 前端配置 React + Vite。
5. 前端创建基础布局。
6. 添加 README 启动说明。

验收标准：

```text
后端可以通过 uvicorn 启动。
前端可以通过 npm run dev 启动。
打开浏览器能看到首页。
```

---

## 阶段 2：设备台账模块

任务：

1. 创建 equipment 数据表。
2. 创建设备增删改查接口。
3. 前端实现设备列表页。
4. 前端实现新增和编辑设备表单。
5. 前端实现设备详情页。

验收标准：

```text
可以新增一台设备。
可以在设备列表看到设备。
可以编辑设备信息。
可以查看设备详情。
```

---

## 阶段 3：状态和位置模块

任务：

1. 创建状态记录表。
2. 创建位置记录表。
3. 实现状态更新接口。
4. 实现位置更新接口。
5. 设备详情页展示状态历史和位置历史。

验收标准：

```text
修改设备状态后，设备当前状态同步变化。
状态历史中可以看到修改记录。
修改设备位置后，设备当前位置同步变化。
位置历史中可以看到移动记录。
```

---

## 阶段 4：外发和生产模块

任务：

1. 创建外发记录表。
2. 创建生产记录表。
3. 实现登记外发。
4. 实现登记返回。
5. 实现生产货号记录。
6. 外发页面显示超期状态。

验收标准：

```text
设备登记外发后，状态自动变成外发中。
设备返回后，可以改成待用、调试中或生产中。
超过预计返回日期未返回的设备显示超期。
设备可以记录当前生产货号。
```

---

## 阶段 5：维修、保养和首页看板

任务：

1. 创建维修异常记录表。
2. 创建保养记录表。
3. 实现维修异常列表和新增功能。
4. 实现保养记录列表和新增功能。
5. 实现首页统计接口。
6. 实现前端首页看板。

验收标准：

```text
首页能看到设备总数和各状态数量。
可以新增维修异常记录。
可以新增保养记录。
设备详情页能看到维修和保养历史。
```

---

## 13. 推荐给 Codex 的执行方式

请不要一次性生成全部复杂功能。请按阶段执行，每次只完成一个阶段。

每个阶段完成后，请做到：

1. 说明修改了哪些文件。
2. 说明如何启动项目。
3. 说明如何测试本阶段功能。
4. 检查是否有明显报错。
5. 不要破坏前一阶段已经完成的功能。

---

## 14. 第一次给 Codex 的提示词

可以直接把下面这段发给 Codex：

```text
请根据这个需求文档，先开发“阶段 1：项目骨架”。

要求：
1. 创建 React + Vite 前端项目。
2. 创建 Python FastAPI 后端项目。
3. 后端配置 SQLite 数据库连接，数据库文件位置为 backend/data/app.db。
4. 后端使用 SQLAlchemy。
5. 后端提供一个健康检查接口 GET /api/health，返回 {"status": "ok"}。
6. 前端创建一个基础首页，显示“自动化设备管理系统”。
7. 前端预留菜单：首页看板、设备台账、外发管理、维修异常、保养记录。
8. 添加根目录 README.md，写清楚如何安装依赖、启动前端、启动后端。
9. 代码要简单清晰，可以运行。
10. 暂时不要实现具体业务功能。

完成后请告诉我：
- 生成了哪些文件
- 如何启动后端
- 如何启动前端
- 如何验证项目是否正常运行
```

---

## 15. 第二次给 Codex 的提示词

阶段 1 完成并确认能运行后，再发下面这段：

```text
请继续开发“阶段 2：设备台账模块”。

要求：
1. 创建 equipment 数据表。
2. 字段包括：设备编号、设备名称、设备类型、品牌、供应商、购买日期、购买金额、当前状态、当前位置、当前生产货号、负责人、备注、是否删除、创建时间、更新时间。
3. 设备编号 equipment_code 必须唯一。
4. 当前状态 current_status 必须来自固定状态选项：生产中、待用、调试中、维修中、保养中、外发中、待验收、停用、报废。
5. 后端实现设备新增、编辑、列表、详情、删除接口。
6. 删除接口使用软删除，不要直接删除数据库记录。
7. 前端实现设备列表页。
8. 前端实现新增设备和编辑设备表单。
9. 前端实现设备详情页。
10. 设备列表支持按状态、设备类型、负责人和关键词筛选。

完成后请告诉我：
- 修改了哪些文件
- 后端接口如何测试
- 前端页面如何操作
```

---

## 16. 第三次给 Codex 的提示词

```text
请继续开发“阶段 3：状态和位置模块”。

要求：
1. 新增 equipment_status_log 表，用于记录设备状态变化。
2. 新增 equipment_location_log 表，用于记录设备位置变化。
3. 实现更新设备状态接口：POST /api/equipment/{id}/status。
4. 每次更新状态时，必须同步更新 equipment.current_status。
5. 每次更新状态时，必须新增一条状态历史记录。
6. 实现更新设备位置接口：POST /api/equipment/{id}/location。
7. 每次更新位置时，必须同步更新 equipment.current_location。
8. 每次更新位置时，必须新增一条位置历史记录。
9. 设备详情页展示状态历史和位置历史。
10. 前端提供更新状态和更新位置的表单。

完成后请告诉我如何测试状态更新和位置更新。
```

---

## 17. 第四次给 Codex 的提示词

```text
请继续开发“阶段 4：外发和生产模块”。

要求：
1. 新增 equipment_outsource_log 表。
2. 新增 equipment_production_log 表。
3. 实现登记设备外发接口。
4. 登记外发时，设备状态自动改为“外发中”。
5. 外发记录包括：外发单位、联系人、联系电话、外发原因、外发日期、预计返回日期、操作人、备注。
6. 实现登记设备返回接口。
7. 登记返回时，填写实际返回日期，并允许把设备状态改为“待用”、“调试中”或“生产中”。
8. 外发列表要显示是否超期。
9. 当前日期大于预计返回日期且实际返回日期为空，视为超期。
10. 实现新增生产记录接口。
11. 新增生产记录时，同步更新设备当前生产货号 current_product_code。
12. 前端增加外发管理页。
13. 设备详情页显示外发历史和生产历史。

完成后请告诉我如何测试外发、返回和生产货号记录。
```

---

## 18. 第五次给 Codex 的提示词

```text
请继续开发“阶段 5：维修、保养和首页看板”。

要求：
1. 新增 equipment_repair_log 表。
2. 新增 equipment_maintenance_log 表。
3. 实现新增维修异常记录接口。
4. 实现更新维修异常处理状态接口。
5. 实现新增保养记录接口。
6. 实现编辑保养记录接口。
7. 实现首页统计接口 GET /api/dashboard/summary。
8. 首页统计包括：设备总数、生产中数量、待用数量、调试中数量、维修中数量、外发中数量、停用数量、外发超期数量、最近10条状态变更记录。
9. 前端实现维修异常页。
10. 前端实现保养记录页。
11. 前端实现首页看板。

完成后请告诉我如何测试维修、保养和首页看板。
```

---

## 19. README 启动说明要求

请在 README.md 中写清楚以下内容。

### 后端启动

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

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173
```

---

## 20. 验收标准

整个 MVP 完成后，系统应满足：

1. 前后端都能正常启动。
2. 可以新增、编辑、查看、停用设备。
3. 可以更新设备状态，并查看状态历史。
4. 可以更新设备位置，并查看位置历史。
5. 可以登记设备外发和返回。
6. 可以判断外发设备是否超期。
7. 可以记录设备当前生产货号。
8. 可以新增维修异常记录。
9. 可以新增保养记录。
10. 首页可以看到设备统计数据。
11. 代码结构清晰，方便继续扩展。

---

## 21. 后续扩展功能

MVP 完成后，可以继续扩展：

1. 用户登录和权限管理。
2. 设备二维码扫码查看详情。
3. Excel 导入导出。
4. 设备图片上传。
5. 维修图片上传。
6. 保养到期提醒。
7. 外发超期提醒。
8. 设备利用率统计。
9. 维修知识库。
10. 备件库存管理。
11. 设备资产盘点。
12. 手机端适配。

---

## 22. 特别注意事项

1. 设备编号不能重复。
2. 状态不能随便输入，必须使用固定选项。
3. 状态变化必须保留历史记录。
4. 外发设备必须有预计返回日期。
5. 设备返回时必须填写实际返回日期。
6. 删除设备建议做软删除。
7. 页面要简单实用，不要做得花里胡哨。
8. 优先保证能用，再考虑好看。
9. 代码要方便我后续继续让 Codex 修改。
10. 每一步开发完成后，都要告诉我怎么测试。

---

## 23. 总结

本项目第一版目标不是做一个很复杂的企业级系统，而是先做一个小型工厂自动化部门能真正用起来的设备管理工具。

核心就是解决几个问题：

```text
设备在哪里？
设备现在是什么状态？
设备有没有外发？
设备正在生产什么货号？
设备有没有异常？
设备有没有保养？
领导能不能一眼看到整体情况？
```

第一版只要能把这些问题解决，就已经有实际价值。
