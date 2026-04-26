# 数据库设计

第一版使用 SQLite，数据库文件位于 `backend/data/app.db`。

阶段 1 仅建立数据库连接和自动建表入口，业务表将在后续阶段逐步创建。

## equipment 设备主表

阶段 2 已实现设备主表，用于保存设备基础资料和当前状态。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_code | 设备编号，唯一 |
| equipment_name | 设备名称 |
| equipment_type | 设备类型 |
| brand | 品牌 |
| supplier | 供应商 |
| purchase_date | 购买日期 |
| purchase_price | 购买金额 |
| current_status | 当前状态，必须来自固定选项 |
| current_location | 当前位置 |
| current_product_code | 当前生产货号 |
| manager | 负责人 |
| remark | 备注 |
| is_deleted | 是否软删除 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

## equipment_status_log 状态变更记录表

阶段 3 已实现状态变更历史。每次通过状态更新接口修改设备状态时，都会同步更新设备主表 `current_status`，并写入一条状态历史。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_id | 设备 ID |
| old_status | 原状态 |
| new_status | 新状态 |
| change_reason | 变更原因 |
| operator | 操作人 |
| change_time | 变更时间 |
| remark | 备注 |

## equipment_location_log 位置变更记录表

阶段 3 已实现位置变更历史。每次通过位置更新接口修改设备位置时，都会同步更新设备主表 `current_location`，并写入一条位置历史。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_id | 设备 ID |
| old_location | 原位置 |
| new_location | 新位置 |
| is_outsource | 是否外发 |
| outsource_company | 外发单位 |
| contact_person | 联系人 |
| contact_phone | 联系电话 |
| move_reason | 移动原因 |
| move_time | 移动时间 |
| operator | 操作人 |
| remark | 备注 |

## equipment_outsource_log 外发记录表

阶段 4 已实现外发登记和返回登记。登记外发时设备状态自动变为“外发中”，返回时可改为“待用 / 调试中 / 生产中”。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_id | 设备 ID |
| outsource_company | 外发单位 |
| contact_person | 联系人 |
| contact_phone | 联系电话 |
| outsource_reason | 外发原因 |
| outsource_date | 外发日期 |
| expected_return_date | 预计返回日期 |
| actual_return_date | 实际返回日期 |
| status | 外发状态 |
| operator | 操作人 |
| remark | 备注 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

## equipment_production_log 生产记录表

阶段 4 已实现生产记录。新增生产记录时，会同步更新设备主表 `current_product_code`，并将设备状态更新为“生产中”。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_id | 设备 ID |
| product_code | 生产货号 |
| product_name | 产品名称 |
| department | 使用部门 |
| start_time | 开始时间 |
| end_time | 结束时间 |
| operator | 操作人员 |
| output_qty | 产量 |
| production_status | 生产状态 |
| remark | 备注 |
| created_at | 创建时间 |

## equipment_repair_log 维修异常记录表

阶段 5 已实现维修异常记录。新增待处理、处理中或需外发记录时，设备状态会同步更新为“维修中”。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_id | 设备 ID |
| issue_time | 异常时间 |
| issue_description | 异常描述 |
| issue_level | 异常等级 |
| reporter | 反馈人 |
| handler | 处理人 |
| repair_status | 处理状态 |
| repair_method | 处理方法 |
| finish_time | 完成时间 |
| downtime_minutes | 停机分钟数 |
| remark | 备注 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

## equipment_maintenance_log 保养记录表

阶段 5 已实现保养记录。

| 字段名 | 说明 |
| --- | --- |
| id | 主键 ID |
| equipment_id | 设备 ID |
| maintenance_type | 保养类型 |
| maintenance_content | 保养内容 |
| plan_date | 计划保养日期 |
| actual_date | 实际保养日期 |
| maintainer | 保养人 |
| result | 保养结果 |
| next_date | 下次保养日期 |
| remark | 备注 |
| created_at | 创建时间 |
| updated_at | 更新时间 |
