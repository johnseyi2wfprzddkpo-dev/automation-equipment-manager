# API 设计

接口前缀统一使用 `/api`。

阶段 1 已实现：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |

阶段 2 已实现：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/equipment/statuses` | 获取固定设备状态选项 |
| GET | `/api/equipment` | 获取设备列表，支持筛选 |
| POST | `/api/equipment` | 新增设备 |
| GET | `/api/equipment/{id}` | 获取设备详情 |
| PUT | `/api/equipment/{id}` | 编辑设备 |
| DELETE | `/api/equipment/{id}` | 软删除设备，并将状态设为停用 |

设备列表筛选参数：

```text
status
equipment_type
location
manager
keyword
```

阶段 3 已实现：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| POST | `/api/equipment/{id}/status` | 更新设备状态并保存历史 |
| GET | `/api/equipment/{id}/status-logs` | 获取设备状态历史 |
| POST | `/api/equipment/{id}/location` | 更新设备位置并保存历史 |
| GET | `/api/equipment/{id}/location-logs` | 获取设备位置历史 |

更新状态请求示例：

```json
{
  "new_status": "生产中",
  "change_reason": "调试完成，投入生产",
  "operator": "张三",
  "remark": "运行稳定"
}
```

更新位置请求示例：

```json
{
  "new_location": "瑞海装配部二线",
  "is_outsource": false,
  "move_reason": "产线调整",
  "operator": "李四",
  "remark": "已完成搬迁"
}
```

阶段 4 已实现：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/outsource` | 获取外发记录列表 |
| POST | `/api/equipment/{id}/outsource` | 登记设备外发 |
| PUT | `/api/outsource/{id}/return` | 登记设备返回 |
| GET | `/api/equipment/{id}/outsource-logs` | 获取设备外发历史 |
| GET | `/api/production` | 获取生产记录列表 |
| POST | `/api/equipment/{id}/production` | 新增生产记录 |
| PUT | `/api/production/{id}` | 编辑生产记录 |
| GET | `/api/equipment/{id}/production-logs` | 获取设备生产历史 |

登记外发请求示例：

```json
{
  "outsource_company": "德立宏供应商",
  "contact_person": "王工",
  "contact_phone": "13800000000",
  "outsource_reason": "程序调试",
  "outsource_date": "2026-04-24",
  "expected_return_date": "2026-04-30",
  "operator": "张三",
  "remark": "外发前已确认"
}
```

登记返回请求示例：

```json
{
  "actual_return_date": "2026-04-25",
  "new_status": "调试中",
  "operator": "李四",
  "remark": "已返回工厂"
}
```

新增生产记录请求示例：

```json
{
  "product_code": "HK-20260424-A01",
  "product_name": "测试产品",
  "department": "装配部",
  "operator": "赵六",
  "output_qty": 100,
  "production_status": "生产中"
}
```

阶段 5 已实现：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/repair` | 获取维修异常列表 |
| POST | `/api/equipment/{id}/repair` | 新增维修异常 |
| PUT | `/api/repair/{id}` | 更新维修处理情况 |
| GET | `/api/equipment/{id}/repair-logs` | 获取设备维修历史 |
| GET | `/api/maintenance` | 获取保养记录列表 |
| POST | `/api/equipment/{id}/maintenance` | 新增保养记录 |
| PUT | `/api/maintenance/{id}` | 编辑保养记录 |
| GET | `/api/equipment/{id}/maintenance-logs` | 获取设备保养历史 |
| GET | `/api/dashboard/summary` | 获取首页统计数据 |

登录权限扩展已实现：

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 用户登录，返回访问 token |
| GET | `/api/auth/me` | 获取当前登录用户 |
| GET | `/api/auth/users` | 获取用户列表，仅管理员 |
| POST | `/api/auth/users` | 创建用户，仅管理员 |

默认管理员账号：

```text
用户名：admin
密码：admin123
```

业务接口访问规则：

| 角色 | 权限说明 |
| --- | --- |
| 管理员 | 设备台账、状态、位置、外发、生产、维修、保养、用户管理全部权限 |
| 技术员 | 状态、位置、外发、生产、维修、保养操作权限，可查看全部数据 |
| 生产人员 | 生产记录和维修异常反馈权限，可查看全部数据 |
| 领导 | 仅查看看板和业务数据 |

新增维修异常请求示例：

```json
{
  "issue_description": "供料异常，影响效率",
  "issue_level": "一般",
  "reporter": "生产员",
  "handler": "维修员",
  "repair_status": "处理中",
  "repair_method": "检查供料机构",
  "downtime_minutes": 15
}
```

新增保养记录请求示例：

```json
{
  "maintenance_type": "日常保养",
  "maintenance_content": "清洁设备和检查气管",
  "plan_date": "2026-04-24",
  "actual_date": "2026-04-24",
  "maintainer": "保养员",
  "result": "正常",
  "next_date": "2026-04-25"
}
```
