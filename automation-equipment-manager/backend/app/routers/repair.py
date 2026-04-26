from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.security import get_current_user, require_roles
from app.utils.excel import build_repair_export, build_repair_template, parse_repair_import


router = APIRouter(tags=["维修异常"], dependencies=[Depends(get_current_user)])


def to_repair_read(log, equipment):
    data = schemas.EquipmentRepairLogRead.model_validate(log).model_dump()
    data["equipment_code"] = equipment.equipment_code
    data["equipment_name"] = equipment.equipment_name
    return data


def _excel_response(stream, filename: str):
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/repair", response_model=list[schemas.EquipmentRepairLogRead])
def list_repair_logs(db: Session = Depends(get_db)):
    return [to_repair_read(log, equipment) for log, equipment in crud.list_repair_logs(db)]


@router.get("/repair/excel/template")
def download_repair_template(_user=Depends(require_roles("管理员", "技术员", "生产人员"))):
    return _excel_response(build_repair_template(), "repair-template.xlsx")


@router.get("/repair/excel/export")
def export_repair_excel(db: Session = Depends(get_db)):
    records = [to_repair_read(log, equipment) for log, equipment in crud.list_repair_logs(db)]
    return _excel_response(build_repair_export(records), "repair-export.xlsx")


@router.post("/repair/excel/import")
async def import_repair_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员", "生产人员")),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只支持 .xlsx 文件")

    records = parse_repair_import(await file.read())
    created_count = 0
    skipped_count = 0

    for equipment_code, repair in records:
        equipment = crud.get_equipment_by_code(db, equipment_code)
        if equipment is None:
            skipped_count += 1
            continue
        crud.create_repair_log(db, equipment, repair)
        created_count += 1

    return {
        "created_count": created_count,
        "skipped_count": skipped_count,
        "total_count": len(records),
    }


@router.post("/equipment/{equipment_id}/repair", response_model=schemas.EquipmentRepairLogRead)
def create_repair_log(
    equipment_id: int,
    repair: schemas.EquipmentRepairCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员", "生产人员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.create_repair_log(db, equipment, repair)
    return to_repair_read(log, equipment)


@router.put("/repair/{repair_id}", response_model=schemas.EquipmentRepairLogRead)
def update_repair_log(
    repair_id: int,
    repair: schemas.EquipmentRepairUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    repair_log = crud.get_repair_log(db, repair_id)
    if repair_log is None:
        raise HTTPException(status_code=404, detail="维修异常记录不存在")
    equipment = crud.get_equipment(db, repair_log.equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.update_repair_log(db, repair_log, repair)
    return to_repair_read(log, equipment)


@router.delete("/repair/{repair_id}", response_model=schemas.EquipmentRepairLogRead)
def delete_repair_log(
    repair_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    repair_log = crud.get_repair_log(db, repair_id)
    if repair_log is None:
        raise HTTPException(status_code=404, detail="维修异常记录不存在")
    equipment = crud.get_equipment(db, repair_log.equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    data = to_repair_read(repair_log, equipment)
    crud.delete_repair_log(db, repair_log)
    return data


@router.get("/equipment/{equipment_id}/repair-logs", response_model=list[schemas.EquipmentRepairLogRead])
def get_equipment_repair_logs(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return [to_repair_read(log, equipment_row) for log, equipment_row in crud.list_equipment_repair_logs(db, equipment_id)]
