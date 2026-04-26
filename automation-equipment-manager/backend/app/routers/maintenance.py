from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.security import get_current_user, require_roles
from app.utils.excel import build_maintenance_export, build_maintenance_template, parse_maintenance_import


router = APIRouter(tags=["保养记录"], dependencies=[Depends(get_current_user)])


def to_maintenance_read(log, equipment):
    data = schemas.EquipmentMaintenanceLogRead.model_validate(log).model_dump()
    data["equipment_code"] = equipment.equipment_code
    data["equipment_name"] = equipment.equipment_name
    return data


def _excel_response(stream, filename: str):
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/maintenance", response_model=list[schemas.EquipmentMaintenanceLogRead])
def list_maintenance_logs(db: Session = Depends(get_db)):
    return [to_maintenance_read(log, equipment) for log, equipment in crud.list_maintenance_logs(db)]


@router.get("/maintenance/reminders", response_model=list[schemas.EquipmentMaintenanceReminderRead])
def list_maintenance_reminders(
    days: int = Query(default=7, ge=0, le=365),
    db: Session = Depends(get_db),
):
    return crud.list_maintenance_reminders(db, days=days)


@router.get("/maintenance/excel/template")
def download_maintenance_template(_user=Depends(require_roles("管理员", "技术员"))):
    return _excel_response(build_maintenance_template(), "maintenance-template.xlsx")


@router.get("/maintenance/excel/export")
def export_maintenance_excel(db: Session = Depends(get_db)):
    records = [to_maintenance_read(log, equipment) for log, equipment in crud.list_maintenance_logs(db)]
    return _excel_response(build_maintenance_export(records), "maintenance-export.xlsx")


@router.post("/maintenance/excel/import")
async def import_maintenance_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只支持 .xlsx 文件")

    records = parse_maintenance_import(await file.read())
    created_count = 0
    skipped_count = 0

    for equipment_code, maintenance in records:
        equipment = crud.get_equipment_by_code(db, equipment_code)
        if equipment is None:
            skipped_count += 1
            continue
        crud.create_maintenance_log(db, equipment, maintenance)
        created_count += 1

    return {
        "created_count": created_count,
        "skipped_count": skipped_count,
        "total_count": len(records),
    }


@router.post("/equipment/{equipment_id}/maintenance", response_model=schemas.EquipmentMaintenanceLogRead)
def create_maintenance_log(
    equipment_id: int,
    maintenance: schemas.EquipmentMaintenanceCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.create_maintenance_log(db, equipment, maintenance)
    return to_maintenance_read(log, equipment)


@router.put("/maintenance/{maintenance_id}", response_model=schemas.EquipmentMaintenanceLogRead)
def update_maintenance_log(
    maintenance_id: int,
    maintenance: schemas.EquipmentMaintenanceUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    maintenance_log = crud.get_maintenance_log(db, maintenance_id)
    if maintenance_log is None:
        raise HTTPException(status_code=404, detail="保养记录不存在")
    equipment = crud.get_equipment(db, maintenance_log.equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.update_maintenance_log(db, maintenance_log, maintenance)
    return to_maintenance_read(log, equipment)


@router.delete("/maintenance/{maintenance_id}", response_model=schemas.EquipmentMaintenanceLogRead)
def delete_maintenance_log(
    maintenance_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    maintenance_log = crud.get_maintenance_log(db, maintenance_id)
    if maintenance_log is None:
        raise HTTPException(status_code=404, detail="保养记录不存在")
    equipment = crud.get_equipment(db, maintenance_log.equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    data = to_maintenance_read(maintenance_log, equipment)
    crud.delete_maintenance_log(db, maintenance_log)
    return data


@router.get("/equipment/{equipment_id}/maintenance-logs", response_model=list[schemas.EquipmentMaintenanceLogRead])
def get_equipment_maintenance_logs(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return [
        to_maintenance_read(log, equipment_row)
        for log, equipment_row in crud.list_equipment_maintenance_logs(db, equipment_id)
    ]
