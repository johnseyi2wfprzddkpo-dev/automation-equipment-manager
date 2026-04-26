from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.security import get_current_user


router = APIRouter(prefix="/dashboard", tags=["首页看板"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    active_equipment = db.query(models.Equipment).filter(models.Equipment.is_deleted.is_(False))

    def count_status(status: str):
        return active_equipment.filter(models.Equipment.current_status == status).count()

    overdue_outsource_count = (
        db.query(models.EquipmentOutsourceLog)
        .join(models.Equipment, models.EquipmentOutsourceLog.equipment_id == models.Equipment.id)
        .filter(
            models.Equipment.is_deleted.is_(False),
            models.EquipmentOutsourceLog.actual_return_date.is_(None),
            models.EquipmentOutsourceLog.expected_return_date < date.today(),
            models.EquipmentOutsourceLog.status == "外发中",
        )
        .count()
    )

    recent_status_rows = (
        db.query(models.EquipmentStatusLog, models.Equipment)
        .join(models.Equipment, models.EquipmentStatusLog.equipment_id == models.Equipment.id)
        .order_by(models.EquipmentStatusLog.change_time.desc())
        .limit(10)
        .all()
    )
    recent_status_logs = []
    for log, equipment in recent_status_rows:
        data = schemas.EquipmentStatusLogRead.model_validate(log).model_dump()
        data["equipment_code"] = equipment.equipment_code
        data["equipment_name"] = equipment.equipment_name
        recent_status_logs.append(data)
    maintenance_reminders = crud.list_maintenance_reminders(db, days=7)
    maintenance_overdue_count = sum(1 for item in maintenance_reminders if item["days_until_due"] < 0)
    maintenance_due_count = sum(1 for item in maintenance_reminders if item["days_until_due"] == 0)
    maintenance_upcoming_count = sum(1 for item in maintenance_reminders if item["days_until_due"] > 0)

    return {
        "total_equipment": active_equipment.count(),
        "production_count": count_status("生产中"),
        "idle_count": count_status("待用"),
        "debugging_count": count_status("调试中"),
        "repair_count": count_status("维修中"),
        "outsource_count": count_status("外发中"),
        "stopped_count": count_status("停用"),
        "overdue_outsource_count": overdue_outsource_count,
        "maintenance_due_count": maintenance_due_count,
        "maintenance_overdue_count": maintenance_overdue_count,
        "maintenance_upcoming_count": maintenance_upcoming_count,
        "maintenance_reminders": maintenance_reminders[:8],
        "recent_status_logs": recent_status_logs,
    }


def _as_naive(value: datetime):
    if value.tzinfo is None:
        return value
    return value.replace(tzinfo=None)


def _merge_intervals(intervals: list[tuple[datetime, datetime]]):
    if not intervals:
        return []

    sorted_intervals = sorted(intervals, key=lambda item: item[0])
    merged = [sorted_intervals[0]]
    for start, end in sorted_intervals[1:]:
        previous_start, previous_end = merged[-1]
        if start <= previous_end:
            merged[-1] = (previous_start, max(previous_end, end))
        else:
            merged.append((start, end))
    return merged


@router.get("/utilization", response_model=schemas.DashboardUtilization)
def get_equipment_utilization(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    today = date.today()
    end_date = end_date or today
    start_date = start_date or (end_date - timedelta(days=29))
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="开始日期不能晚于结束日期")

    range_start = datetime.combine(start_date, time.min)
    range_end = datetime.combine(end_date + timedelta(days=1), time.min)
    now = _as_naive(models.utc_now())
    effective_end = min(range_end, now)
    available_seconds = max((effective_end - range_start).total_seconds(), 0)

    equipment_list = (
        db.query(models.Equipment)
        .filter(models.Equipment.is_deleted.is_(False))
        .order_by(models.Equipment.equipment_code.asc())
        .all()
    )

    production_logs = (
        db.query(models.EquipmentProductionLog)
        .join(models.Equipment, models.EquipmentProductionLog.equipment_id == models.Equipment.id)
        .filter(
            models.Equipment.is_deleted.is_(False),
            models.EquipmentProductionLog.start_time < range_end,
        )
        .all()
    )

    intervals_by_equipment: dict[int, list[tuple[datetime, datetime]]] = {equipment.id: [] for equipment in equipment_list}
    counts_by_equipment: dict[int, int] = {equipment.id: 0 for equipment in equipment_list}

    for log in production_logs:
        log_start = _as_naive(log.start_time)
        log_end = _as_naive(log.end_time) if log.end_time else now
        if log_end <= range_start or log_start >= range_end or log_end <= log_start:
            continue
        clipped_start = max(log_start, range_start)
        clipped_end = min(log_end, effective_end)
        if clipped_end <= clipped_start:
            continue
        intervals_by_equipment.setdefault(log.equipment_id, []).append((clipped_start, clipped_end))
        counts_by_equipment[log.equipment_id] = counts_by_equipment.get(log.equipment_id, 0) + 1

    items = []
    total_run_seconds = 0.0
    for equipment in equipment_list:
        merged_intervals = _merge_intervals(intervals_by_equipment.get(equipment.id, []))
        run_seconds = sum((end - start).total_seconds() for start, end in merged_intervals)
        total_run_seconds += run_seconds
        utilization_rate = (run_seconds / available_seconds * 100) if available_seconds else 0
        items.append({
            "equipment_id": equipment.id,
            "equipment_code": equipment.equipment_code,
            "equipment_name": equipment.equipment_name,
            "equipment_type": equipment.equipment_type,
            "current_status": equipment.current_status,
            "run_hours": round(run_seconds / 3600, 2),
            "available_hours": round(available_seconds / 3600, 2),
            "utilization_rate": round(min(utilization_rate, 100), 2),
            "production_count": counts_by_equipment.get(equipment.id, 0),
        })

    items.sort(key=lambda item: item["utilization_rate"], reverse=True)
    total_available_seconds = available_seconds * len(equipment_list)
    average_rate = (total_run_seconds / total_available_seconds * 100) if total_available_seconds else 0

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_equipment": len(equipment_list),
        "average_utilization_rate": round(min(average_rate, 100), 2),
        "total_run_hours": round(total_run_seconds / 3600, 2),
        "total_available_hours": round(total_available_seconds / 3600, 2),
        "items": items,
    }
