
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas


def get_equipment(db: Session, equipment_id: int):
    return (
        db.query(models.Equipment)
        .filter(models.Equipment.id == equipment_id, models.Equipment.is_deleted.is_(False))
        .first()
    )


def get_equipment_by_code(db: Session, equipment_code: str):
    return (
        db.query(models.Equipment)
        .filter(models.Equipment.equipment_code == equipment_code, models.Equipment.is_deleted.is_(False))
        .first()
    )


def list_equipment(
    db: Session,
    status: str | None = None,
    equipment_type: str | None = None,
    location: str | None = None,
    manager: str | None = None,
    keyword: str | None = None,
):
    query = db.query(models.Equipment).filter(models.Equipment.is_deleted.is_(False))

    if status:
        query = query.filter(models.Equipment.current_status == status)
    if equipment_type:
        query = query.filter(models.Equipment.equipment_type.contains(equipment_type))
    if location:
        query = query.filter(models.Equipment.current_location.contains(location))
    if manager:
        query = query.filter(models.Equipment.manager.contains(manager))
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            or_(
                models.Equipment.equipment_code.like(like_keyword),
                models.Equipment.equipment_name.like(like_keyword),
                models.Equipment.equipment_type.like(like_keyword),
                models.Equipment.current_location.like(like_keyword),
                models.Equipment.manager.like(like_keyword),
            )
        )

    return query.order_by(models.Equipment.updated_at.desc()).all()


def create_equipment(db: Session, equipment: schemas.EquipmentCreate):
    db_equipment = models.Equipment(**equipment.model_dump())
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


def update_equipment(db: Session, db_equipment: models.Equipment, equipment: schemas.EquipmentUpdate):
    for key, value in equipment.model_dump().items():
        setattr(db_equipment, key, value)
    db_equipment.updated_at = models.utc_now()
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


def soft_delete_equipment(db: Session, db_equipment: models.Equipment):
    db_equipment.is_deleted = True
    db_equipment.current_status = "停用"
    db_equipment.updated_at = models.utc_now()
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


def list_equipment_images(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentImage)
        .filter(models.EquipmentImage.equipment_id == equipment_id)
        .order_by(models.EquipmentImage.created_at.desc())
        .all()
    )


def create_equipment_image(
    db: Session,
    equipment_id: int,
    original_filename: str,
    stored_filename: str,
    content_type: str,
    file_size: int,
    url: str,
):
    image = models.EquipmentImage(
        equipment_id=equipment_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        file_size=file_size,
        url=url,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def get_equipment_image(db: Session, image_id: int):
    return db.query(models.EquipmentImage).filter(models.EquipmentImage.id == image_id).first()


def delete_equipment_image(db: Session, image: models.EquipmentImage):
    db.delete(image)
    db.commit()
    return image


def update_equipment_status(
    db: Session,
    db_equipment: models.Equipment,
    status_update: schemas.EquipmentStatusUpdate,
):
    status_log = models.EquipmentStatusLog(
        equipment_id=db_equipment.id,
        old_status=db_equipment.current_status,
        new_status=status_update.new_status,
        change_reason=status_update.change_reason,
        operator=status_update.operator,
        remark=status_update.remark,
    )
    db_equipment.current_status = status_update.new_status
    db_equipment.updated_at = models.utc_now()
    db.add(status_log)
    db.commit()
    db.refresh(status_log)
    db.refresh(db_equipment)
    return status_log


def list_equipment_status_logs(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentStatusLog)
        .filter(models.EquipmentStatusLog.equipment_id == equipment_id)
        .order_by(models.EquipmentStatusLog.change_time.desc())
        .all()
    )


def update_equipment_location(
    db: Session,
    db_equipment: models.Equipment,
    location_update: schemas.EquipmentLocationUpdate,
):
    location_log = models.EquipmentLocationLog(
        equipment_id=db_equipment.id,
        old_location=db_equipment.current_location,
        new_location=location_update.new_location,
        is_outsource=location_update.is_outsource,
        outsource_company=location_update.outsource_company,
        contact_person=location_update.contact_person,
        contact_phone=location_update.contact_phone,
        move_reason=location_update.move_reason,
        operator=location_update.operator,
        remark=location_update.remark,
    )
    db_equipment.current_location = location_update.new_location
    db_equipment.updated_at = models.utc_now()
    db.add(location_log)
    db.commit()
    db.refresh(location_log)
    db.refresh(db_equipment)
    return location_log


def list_equipment_location_logs(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentLocationLog)
        .filter(models.EquipmentLocationLog.equipment_id == equipment_id)
        .order_by(models.EquipmentLocationLog.move_time.desc())
        .all()
    )


def create_outsource_log(
    db: Session,
    db_equipment: models.Equipment,
    outsource: schemas.EquipmentOutsourceCreate,
):
    old_status = db_equipment.current_status
    outsource_log = models.EquipmentOutsourceLog(
        equipment_id=db_equipment.id,
        **outsource.model_dump(),
    )
    status_log = models.EquipmentStatusLog(
        equipment_id=db_equipment.id,
        old_status=old_status,
        new_status="外发中",
        change_reason=outsource.outsource_reason or "登记外发",
        operator=outsource.operator,
        remark=outsource.remark,
    )
    db_equipment.current_status = "外发中"
    db_equipment.updated_at = models.utc_now()
    db.add(outsource_log)
    db.add(status_log)
    db.commit()
    db.refresh(outsource_log)
    db.refresh(db_equipment)
    return outsource_log


def list_outsource_logs(db: Session):
    return (
        db.query(models.EquipmentOutsourceLog, models.Equipment)
        .join(models.Equipment, models.EquipmentOutsourceLog.equipment_id == models.Equipment.id)
        .filter(models.Equipment.is_deleted.is_(False))
        .order_by(models.EquipmentOutsourceLog.created_at.desc())
        .all()
    )


def list_equipment_outsource_logs(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentOutsourceLog, models.Equipment)
        .join(models.Equipment, models.EquipmentOutsourceLog.equipment_id == models.Equipment.id)
        .filter(models.EquipmentOutsourceLog.equipment_id == equipment_id)
        .order_by(models.EquipmentOutsourceLog.created_at.desc())
        .all()
    )


def get_outsource_log(db: Session, outsource_id: int):
    return (
        db.query(models.EquipmentOutsourceLog)
        .filter(models.EquipmentOutsourceLog.id == outsource_id)
        .first()
    )


def return_outsource_log(
    db: Session,
    outsource_log: models.EquipmentOutsourceLog,
    db_equipment: models.Equipment,
    return_data: schemas.EquipmentOutsourceReturn,
):
    old_status = db_equipment.current_status
    outsource_log.actual_return_date = return_data.actual_return_date
    outsource_log.status = "已返回"
    outsource_log.updated_at = models.utc_now()
    if return_data.remark:
        outsource_log.remark = return_data.remark

    db_equipment.current_status = return_data.new_status
    db_equipment.updated_at = models.utc_now()
    status_log = models.EquipmentStatusLog(
        equipment_id=db_equipment.id,
        old_status=old_status,
        new_status=return_data.new_status,
        change_reason="外发返回",
        operator=return_data.operator,
        remark=return_data.remark,
    )
    db.add(status_log)
    db.commit()
    db.refresh(outsource_log)
    db.refresh(db_equipment)
    return outsource_log


def create_production_log(
    db: Session,
    db_equipment: models.Equipment,
    production: schemas.EquipmentProductionCreate,
):
    data = production.model_dump()
    if data["start_time"] is None:
        data["start_time"] = models.utc_now()
    production_log = models.EquipmentProductionLog(
        equipment_id=db_equipment.id,
        **data,
    )
    old_status = db_equipment.current_status
    db_equipment.current_product_code = production.product_code
    db_equipment.current_status = "生产中"
    db_equipment.updated_at = models.utc_now()
    db.add(production_log)
    if old_status != "生产中":
        db.add(
            models.EquipmentStatusLog(
                equipment_id=db_equipment.id,
                old_status=old_status,
                new_status="生产中",
                change_reason="登记生产记录",
                operator=production.operator,
                remark=production.remark,
            )
        )
    db.commit()
    db.refresh(production_log)
    db.refresh(db_equipment)
    return production_log


def update_production_log(
    db: Session,
    production_log: models.EquipmentProductionLog,
    production: schemas.EquipmentProductionUpdate,
):
    data = production.model_dump()
    if data["start_time"] is None:
        data["start_time"] = production_log.start_time
    for key, value in data.items():
        setattr(production_log, key, value)
    db.commit()
    db.refresh(production_log)
    return production_log


def get_production_log(db: Session, production_id: int):
    return (
        db.query(models.EquipmentProductionLog)
        .filter(models.EquipmentProductionLog.id == production_id)
        .first()
    )


def list_production_logs(db: Session):
    return (
        db.query(models.EquipmentProductionLog, models.Equipment)
        .join(models.Equipment, models.EquipmentProductionLog.equipment_id == models.Equipment.id)
        .filter(models.Equipment.is_deleted.is_(False))
        .order_by(models.EquipmentProductionLog.created_at.desc())
        .all()
    )


def list_equipment_production_logs(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentProductionLog, models.Equipment)
        .join(models.Equipment, models.EquipmentProductionLog.equipment_id == models.Equipment.id)
        .filter(models.EquipmentProductionLog.equipment_id == equipment_id)
        .order_by(models.EquipmentProductionLog.created_at.desc())
        .all()
    )


def create_repair_log(db: Session, db_equipment: models.Equipment, repair: schemas.EquipmentRepairCreate):
    data = repair.model_dump()
    if data["issue_time"] is None:
        data["issue_time"] = models.utc_now()
    repair_log = models.EquipmentRepairLog(equipment_id=db_equipment.id, **data)
    db.add(repair_log)
    if repair.repair_status in ["待处理", "处理中", "需外发"]:
        old_status = db_equipment.current_status
        db_equipment.current_status = "维修中"
        db_equipment.updated_at = models.utc_now()
        if old_status != "维修中":
            db.add(
                models.EquipmentStatusLog(
                    equipment_id=db_equipment.id,
                    old_status=old_status,
                    new_status="维修中",
                    change_reason="新增维修异常记录",
                    operator=repair.handler,
                    remark=repair.remark,
                )
            )
    db.commit()
    db.refresh(repair_log)
    db.refresh(db_equipment)
    return repair_log


def update_repair_log(db: Session, repair_log: models.EquipmentRepairLog, repair: schemas.EquipmentRepairUpdate):
    data = repair.model_dump()
    if data["issue_time"] is None:
        data["issue_time"] = repair_log.issue_time
    for key, value in data.items():
        setattr(repair_log, key, value)
    repair_log.updated_at = models.utc_now()
    db.commit()
    db.refresh(repair_log)
    return repair_log


def delete_repair_log(db: Session, repair_log: models.EquipmentRepairLog):
    db.delete(repair_log)
    db.commit()
    return repair_log


def get_repair_log(db: Session, repair_id: int):
    return db.query(models.EquipmentRepairLog).filter(models.EquipmentRepairLog.id == repair_id).first()


def list_repair_logs(db: Session):
    return (
        db.query(models.EquipmentRepairLog, models.Equipment)
        .join(models.Equipment, models.EquipmentRepairLog.equipment_id == models.Equipment.id)
        .filter(models.Equipment.is_deleted.is_(False))
        .order_by(models.EquipmentRepairLog.created_at.desc())
        .all()
    )


def list_equipment_repair_logs(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentRepairLog, models.Equipment)
        .join(models.Equipment, models.EquipmentRepairLog.equipment_id == models.Equipment.id)
        .filter(models.EquipmentRepairLog.equipment_id == equipment_id)
        .order_by(models.EquipmentRepairLog.created_at.desc())
        .all()
    )


def create_maintenance_log(
    db: Session,
    db_equipment: models.Equipment,
    maintenance: schemas.EquipmentMaintenanceCreate,
):
    maintenance_log = models.EquipmentMaintenanceLog(equipment_id=db_equipment.id, **maintenance.model_dump())
    db.add(maintenance_log)
    db.commit()
    db.refresh(maintenance_log)
    return maintenance_log


def update_maintenance_log(
    db: Session,
    maintenance_log: models.EquipmentMaintenanceLog,
    maintenance: schemas.EquipmentMaintenanceUpdate,
):
    for key, value in maintenance.model_dump().items():
        setattr(maintenance_log, key, value)
    maintenance_log.updated_at = models.utc_now()
    db.commit()
    db.refresh(maintenance_log)
    return maintenance_log


def delete_maintenance_log(db: Session, maintenance_log: models.EquipmentMaintenanceLog):
    db.delete(maintenance_log)
    db.commit()
    return maintenance_log


def get_maintenance_log(db: Session, maintenance_id: int):
    return (
        db.query(models.EquipmentMaintenanceLog)
        .filter(models.EquipmentMaintenanceLog.id == maintenance_id)
        .first()
    )


def list_maintenance_logs(db: Session):
    return (
        db.query(models.EquipmentMaintenanceLog, models.Equipment)
        .join(models.Equipment, models.EquipmentMaintenanceLog.equipment_id == models.Equipment.id)
        .filter(models.Equipment.is_deleted.is_(False))
        .order_by(models.EquipmentMaintenanceLog.created_at.desc())
        .all()
    )


def list_maintenance_reminders(db: Session, days: int = 7):
    from datetime import date, timedelta

    today = date.today()
    due_before = today + timedelta(days=days)
    rows = (
        db.query(models.EquipmentMaintenanceLog, models.Equipment)
        .join(models.Equipment, models.EquipmentMaintenanceLog.equipment_id == models.Equipment.id)
        .filter(
            models.Equipment.is_deleted.is_(False),
            models.EquipmentMaintenanceLog.next_date.isnot(None),
        )
        .order_by(models.EquipmentMaintenanceLog.created_at.desc())
        .all()
    )

    latest_by_equipment = {}
    for log, equipment in rows:
        if equipment.id not in latest_by_equipment:
            latest_by_equipment[equipment.id] = (log, equipment)

    reminders = []
    for log, equipment in latest_by_equipment.values():
        if log.next_date > due_before:
            continue
        days_until_due = (log.next_date - today).days
        if days_until_due < 0:
            reminder_status = "已逾期"
        elif days_until_due == 0:
            reminder_status = "今日到期"
        else:
            reminder_status = "即将到期"
        reminders.append({
            "id": log.id,
            "equipment_id": equipment.id,
            "equipment_code": equipment.equipment_code,
            "equipment_name": equipment.equipment_name,
            "maintenance_type": log.maintenance_type,
            "maintenance_content": log.maintenance_content,
            "last_actual_date": log.actual_date,
            "next_date": log.next_date,
            "maintainer": log.maintainer,
            "result": log.result,
            "days_until_due": days_until_due,
            "reminder_status": reminder_status,
            "remark": log.remark,
        })

    return sorted(reminders, key=lambda item: (item["next_date"], item["equipment_code"]))


def list_equipment_maintenance_logs(db: Session, equipment_id: int):
    return (
        db.query(models.EquipmentMaintenanceLog, models.Equipment)
        .join(models.Equipment, models.EquipmentMaintenanceLog.equipment_id == models.Equipment.id)
        .filter(models.EquipmentMaintenanceLog.equipment_id == equipment_id)
        .order_by(models.EquipmentMaintenanceLog.created_at.desc())
        .all()
    )
