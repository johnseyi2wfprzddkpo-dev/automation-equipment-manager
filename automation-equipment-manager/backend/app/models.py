from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text

from app.database import Base


LOCAL_TIMEZONE = timezone(timedelta(hours=8))


def utc_now():
    return datetime.now(LOCAL_TIMEZONE).replace(tzinfo=None)


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    equipment_code = Column(String(80), unique=True, index=True, nullable=False)
    equipment_name = Column(String(160), nullable=False)
    equipment_type = Column(String(80), nullable=False)
    brand = Column(String(120), nullable=True)
    supplier = Column(String(160), nullable=True)
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Float, nullable=True)
    current_status = Column(String(30), nullable=False, default="待用")
    current_location = Column(String(200), nullable=True)
    current_product_code = Column(String(120), nullable=True)
    manager = Column(String(80), nullable=True)
    remark = Column(Text, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class EquipmentImage(Base):
    __tablename__ = "equipment_image"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    original_filename = Column(String(240), nullable=False)
    stored_filename = Column(String(240), unique=True, nullable=False)
    content_type = Column(String(80), nullable=False)
    file_size = Column(Integer, nullable=False)
    url = Column(String(300), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class EquipmentStatusLog(Base):
    __tablename__ = "equipment_status_log"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    old_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    change_reason = Column(Text, nullable=True)
    operator = Column(String(80), nullable=True)
    change_time = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    remark = Column(Text, nullable=True)


class EquipmentLocationLog(Base):
    __tablename__ = "equipment_location_log"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    old_location = Column(String(200), nullable=True)
    new_location = Column(String(200), nullable=False)
    is_outsource = Column(Boolean, nullable=False, default=False)
    outsource_company = Column(String(160), nullable=True)
    contact_person = Column(String(80), nullable=True)
    contact_phone = Column(String(40), nullable=True)
    move_reason = Column(Text, nullable=True)
    move_time = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    operator = Column(String(80), nullable=True)
    remark = Column(Text, nullable=True)


class EquipmentOutsourceLog(Base):
    __tablename__ = "equipment_outsource_log"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    outsource_company = Column(String(160), nullable=False)
    contact_person = Column(String(80), nullable=True)
    contact_phone = Column(String(40), nullable=True)
    outsource_reason = Column(Text, nullable=True)
    outsource_date = Column(Date, nullable=False)
    expected_return_date = Column(Date, nullable=False)
    actual_return_date = Column(Date, nullable=True)
    status = Column(String(30), nullable=False, default="外发中")
    operator = Column(String(80), nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class EquipmentProductionLog(Base):
    __tablename__ = "equipment_production_log"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    product_code = Column(String(120), nullable=False)
    product_name = Column(String(160), nullable=True)
    department = Column(String(120), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    end_time = Column(DateTime(timezone=True), nullable=True)
    operator = Column(String(80), nullable=True)
    output_qty = Column(Integer, nullable=True)
    production_status = Column(String(40), nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class EquipmentRepairLog(Base):
    __tablename__ = "equipment_repair_log"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    issue_time = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    issue_description = Column(Text, nullable=False)
    issue_level = Column(String(30), nullable=False)
    reporter = Column(String(80), nullable=True)
    handler = Column(String(80), nullable=True)
    repair_status = Column(String(30), nullable=False, default="待处理")
    repair_method = Column(Text, nullable=True)
    finish_time = Column(DateTime(timezone=True), nullable=True)
    downtime_minutes = Column(Integer, nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class EquipmentMaintenanceLog(Base):
    __tablename__ = "equipment_maintenance_log"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    maintenance_type = Column(String(40), nullable=False)
    maintenance_content = Column(Text, nullable=False)
    plan_date = Column(Date, nullable=True)
    actual_date = Column(Date, nullable=True)
    maintainer = Column(String(80), nullable=True)
    result = Column(String(80), nullable=True)
    next_date = Column(Date, nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class EquipmentBenefitAnalysisConfig(Base):
    __tablename__ = "equipment_benefit_analysis_config"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), index=True, nullable=False)
    product_code = Column(String(120), nullable=False, index=True)
    product_name = Column(String(160), nullable=True)
    process_name = Column(String(160), nullable=False)
    monthly_output_qty = Column(Integer, nullable=False, default=0)
    investment_amount = Column(Float, nullable=False, default=0)
    manual_minutes_per_unit = Column(Float, nullable=False)
    manual_worker_count = Column(Float, nullable=False, default=1)
    automation_minutes_per_unit = Column(Float, nullable=False)
    automation_worker_count = Column(Float, nullable=False, default=1)
    labor_cost_per_hour = Column(Float, nullable=False, default=0)
    depreciation_months = Column(Integer, nullable=False, default=36)
    monthly_maintenance_cost = Column(Float, nullable=False, default=0)
    monthly_energy_cost = Column(Float, nullable=False, default=0)
    remark = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    full_name = Column(String(120), nullable=True)
    role = Column(String(40), nullable=False, default="领导")
    password_hash = Column(String(240), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
