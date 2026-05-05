
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.utils.enums import EQUIPMENT_STATUSES


class EquipmentBase(BaseModel):
    equipment_code: str = Field(..., min_length=1, max_length=80)
    equipment_name: str = Field(..., min_length=1, max_length=160)
    equipment_type: str = Field(..., min_length=1, max_length=80)
    brand: str | None = Field(default=None, max_length=120)
    supplier: str | None = Field(default=None, max_length=160)
    purchase_date: date | None = None
    purchase_price: float | None = Field(default=None, ge=0)
    current_status: str = "待用"
    current_location: str | None = Field(default=None, max_length=200)
    current_product_code: str | None = Field(default=None, max_length=120)
    manager: str | None = Field(default=None, max_length=80)
    remark: str | None = None

    @field_validator("equipment_code", "equipment_name", "equipment_type")
    @classmethod
    def required_text(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("不能为空")
        return value

    @field_validator("current_status")
    @classmethod
    def validate_status(cls, value: str):
        if value not in EQUIPMENT_STATUSES:
            raise ValueError(f"状态必须是固定选项：{', '.join(EQUIPMENT_STATUSES)}")
        return value


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(EquipmentBase):
    pass


class EquipmentRead(EquipmentBase):
    id: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentImageRead(BaseModel):
    id: int
    equipment_id: int
    original_filename: str
    stored_filename: str
    content_type: str
    file_size: int
    url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentStatusUpdate(BaseModel):
    new_status: str
    change_reason: str | None = None
    operator: str | None = Field(default=None, max_length=80)
    remark: str | None = None

    @field_validator("new_status")
    @classmethod
    def validate_new_status(cls, value: str):
        if value not in EQUIPMENT_STATUSES:
            raise ValueError(f"状态必须是固定选项：{', '.join(EQUIPMENT_STATUSES)}")
        return value


class EquipmentStatusLogRead(BaseModel):
    id: int
    equipment_id: int
    equipment_code: str | None = None
    equipment_name: str | None = None
    old_status: str
    new_status: str
    change_reason: str | None
    operator: str | None
    change_time: datetime
    remark: str | None

    model_config = ConfigDict(from_attributes=True)


class EquipmentLocationUpdate(BaseModel):
    new_location: str = Field(..., min_length=1, max_length=200)
    is_outsource: bool = False
    outsource_company: str | None = Field(default=None, max_length=160)
    contact_person: str | None = Field(default=None, max_length=80)
    contact_phone: str | None = Field(default=None, max_length=40)
    move_reason: str | None = None
    operator: str | None = Field(default=None, max_length=80)
    remark: str | None = None

    @field_validator("new_location")
    @classmethod
    def required_location(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("新位置不能为空")
        return value


class EquipmentLocationLogRead(BaseModel):
    id: int
    equipment_id: int
    old_location: str | None
    new_location: str
    is_outsource: bool
    outsource_company: str | None
    contact_person: str | None
    contact_phone: str | None
    move_reason: str | None
    move_time: datetime
    operator: str | None
    remark: str | None

    model_config = ConfigDict(from_attributes=True)


class EquipmentOutsourceCreate(BaseModel):
    outsource_company: str = Field(..., min_length=1, max_length=160)
    contact_person: str | None = Field(default=None, max_length=80)
    contact_phone: str | None = Field(default=None, max_length=40)
    outsource_reason: str | None = None
    outsource_date: date
    expected_return_date: date
    operator: str | None = Field(default=None, max_length=80)
    remark: str | None = None

    @field_validator("outsource_company")
    @classmethod
    def required_company(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("外发单位不能为空")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.expected_return_date < self.outsource_date:
            raise ValueError("预计返回日期不能早于外发日期")
        return self


class EquipmentOutsourceReturn(BaseModel):
    actual_return_date: date
    new_status: str = "待用"
    operator: str | None = Field(default=None, max_length=80)
    remark: str | None = None

    @field_validator("new_status")
    @classmethod
    def validate_return_status(cls, value: str):
        allowed = ["待用", "调试中", "生产中"]
        if value not in allowed:
            raise ValueError(f"返回后状态必须是：{', '.join(allowed)}")
        return value


class EquipmentOutsourceLogRead(BaseModel):
    id: int
    equipment_id: int
    equipment_code: str | None = None
    equipment_name: str | None = None
    outsource_company: str
    contact_person: str | None
    contact_phone: str | None
    outsource_reason: str | None
    outsource_date: date
    expected_return_date: date
    actual_return_date: date | None
    status: str
    operator: str | None
    remark: str | None
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentProductionCreate(BaseModel):
    product_code: str = Field(..., min_length=1, max_length=120)
    product_name: str | None = Field(default=None, max_length=160)
    department: str | None = Field(default=None, max_length=120)
    start_time: datetime | None = None
    end_time: datetime | None = None
    operator: str | None = Field(default=None, max_length=80)
    output_qty: int | None = Field(default=None, ge=0)
    production_status: str | None = Field(default=None, max_length=40)
    remark: str | None = None

    @field_validator("product_code")
    @classmethod
    def required_product_code(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("生产货号不能为空")
        return value


class EquipmentProductionUpdate(EquipmentProductionCreate):
    pass


class EquipmentProductionLogRead(BaseModel):
    id: int
    equipment_id: int
    equipment_code: str | None = None
    equipment_name: str | None = None
    product_code: str
    product_name: str | None
    department: str | None
    start_time: datetime
    end_time: datetime | None
    operator: str | None
    output_qty: int | None
    production_status: str | None
    remark: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


ISSUE_LEVELS = ["轻微", "一般", "严重", "重大"]
REPAIR_STATUSES = ["待处理", "处理中", "已解决", "需外发"]
MAINTENANCE_TYPES = ["日常保养", "周保养", "月保养", "年度保养", "临时保养"]


class EquipmentRepairCreate(BaseModel):
    issue_time: datetime | None = None
    issue_description: str = Field(..., min_length=1)
    issue_level: str = "一般"
    reporter: str | None = Field(default=None, max_length=80)
    handler: str | None = Field(default=None, max_length=80)
    repair_status: str = "待处理"
    repair_method: str | None = None
    finish_time: datetime | None = None
    downtime_minutes: int | None = Field(default=None, ge=0)
    remark: str | None = None

    @field_validator("issue_description")
    @classmethod
    def required_issue_description(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("异常描述不能为空")
        return value

    @field_validator("issue_level")
    @classmethod
    def validate_issue_level(cls, value: str):
        if value not in ISSUE_LEVELS:
            raise ValueError(f"异常等级必须是：{', '.join(ISSUE_LEVELS)}")
        return value

    @field_validator("repair_status")
    @classmethod
    def validate_repair_status(cls, value: str):
        if value not in REPAIR_STATUSES:
            raise ValueError(f"处理状态必须是：{', '.join(REPAIR_STATUSES)}")
        return value


class EquipmentRepairUpdate(EquipmentRepairCreate):
    pass


class EquipmentRepairLogRead(BaseModel):
    id: int
    equipment_id: int
    equipment_code: str | None = None
    equipment_name: str | None = None
    issue_time: datetime
    issue_description: str
    issue_level: str
    reporter: str | None
    handler: str | None
    repair_status: str
    repair_method: str | None
    finish_time: datetime | None
    downtime_minutes: int | None
    remark: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentMaintenanceCreate(BaseModel):
    maintenance_type: str = "日常保养"
    maintenance_content: str = Field(..., min_length=1)
    plan_date: date | None = None
    actual_date: date | None = None
    maintainer: str | None = Field(default=None, max_length=80)
    result: str | None = Field(default=None, max_length=80)
    next_date: date | None = None
    remark: str | None = None

    @field_validator("maintenance_type")
    @classmethod
    def validate_maintenance_type(cls, value: str):
        if value not in MAINTENANCE_TYPES:
            raise ValueError(f"保养类型必须是：{', '.join(MAINTENANCE_TYPES)}")
        return value

    @field_validator("maintenance_content")
    @classmethod
    def required_maintenance_content(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("保养内容不能为空")
        return value


class EquipmentMaintenanceUpdate(EquipmentMaintenanceCreate):
    pass


class EquipmentMaintenanceLogRead(BaseModel):
    id: int
    equipment_id: int
    equipment_code: str | None = None
    equipment_name: str | None = None
    maintenance_type: str
    maintenance_content: str
    plan_date: date | None
    actual_date: date | None
    maintainer: str | None
    result: str | None
    next_date: date | None
    remark: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentMaintenanceReminderRead(BaseModel):
    id: int
    equipment_id: int
    equipment_code: str
    equipment_name: str
    maintenance_type: str
    maintenance_content: str
    last_actual_date: date | None
    next_date: date
    maintainer: str | None
    result: str | None
    days_until_due: int
    reminder_status: str
    remark: str | None


class DashboardSummary(BaseModel):
    total_equipment: int
    production_count: int
    idle_count: int
    debugging_count: int
    repair_count: int
    outsource_count: int
    stopped_count: int
    overdue_outsource_count: int
    maintenance_due_count: int
    maintenance_overdue_count: int
    maintenance_upcoming_count: int
    maintenance_reminders: list[EquipmentMaintenanceReminderRead]
    recent_status_logs: list[EquipmentStatusLogRead]


class EquipmentUtilizationItem(BaseModel):
    equipment_id: int
    equipment_code: str
    equipment_name: str
    equipment_type: str
    current_status: str
    run_hours: float
    available_hours: float
    utilization_rate: float
    production_count: int


class DashboardUtilization(BaseModel):
    start_date: date
    end_date: date
    total_equipment: int
    average_utilization_rate: float
    total_run_hours: float
    total_available_hours: float
    items: list[EquipmentUtilizationItem]


class BenefitConfigBase(BaseModel):
    equipment_id: int
    product_code: str = Field(..., min_length=1, max_length=120)
    product_name: str | None = Field(default=None, max_length=160)
    process_name: str = Field(..., min_length=1, max_length=160)
    monthly_output_qty: int = Field(default=0, ge=0)
    investment_amount: float = Field(default=0, ge=0)
    manual_minutes_per_unit: float = Field(..., gt=0)
    manual_worker_count: float = Field(default=1, gt=0)
    automation_minutes_per_unit: float = Field(..., gt=0)
    automation_worker_count: float = Field(default=1, gt=0)
    labor_cost_per_hour: float = Field(default=0, ge=0)
    depreciation_months: int = Field(default=36, gt=0)
    monthly_maintenance_cost: float = Field(default=0, ge=0)
    monthly_energy_cost: float = Field(default=0, ge=0)
    remark: str | None = None
    is_active: bool = True

    @field_validator("product_code", "process_name")
    @classmethod
    def required_benefit_text(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("不能为空")
        return value


class BenefitConfigCreate(BenefitConfigBase):
    pass


class BenefitConfigUpdate(BenefitConfigBase):
    pass


class BenefitConfigRead(BenefitConfigBase):
    id: int
    equipment_code: str | None = None
    equipment_name: str | None = None
    equipment_type: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


USER_ROLES = ["管理员", "技术员", "生产人员", "领导"]


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=120)


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=6, max_length=120)
    full_name: str | None = Field(default=None, max_length=120)
    role: str = "领导"
    is_active: bool = True

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str):
        if value not in USER_ROLES:
            raise ValueError(f"角色必须是：{', '.join(USER_ROLES)}")
        return value


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    role: str
    is_active: bool = True

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str):
        if value not in USER_ROLES:
            raise ValueError(f"角色必须是：{', '.join(USER_ROLES)}")
        return value


class UserRead(BaseModel):
    id: int
    username: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
