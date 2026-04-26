from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.security import get_current_user, require_roles
from app.utils.excel import build_production_export, build_production_template, parse_production_import


router = APIRouter(tags=["生产记录"], dependencies=[Depends(get_current_user)])


def to_production_read(log, equipment):
    data = schemas.EquipmentProductionLogRead.model_validate(log).model_dump()
    data["equipment_code"] = equipment.equipment_code
    data["equipment_name"] = equipment.equipment_name
    return data


def _excel_response(stream, filename: str):
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/production", response_model=list[schemas.EquipmentProductionLogRead])
def list_production_logs(db: Session = Depends(get_db)):
    return [to_production_read(log, equipment) for log, equipment in crud.list_production_logs(db)]


@router.get("/production/excel/template")
def download_production_template(_user=Depends(require_roles("管理员", "技术员", "生产人员"))):
    return _excel_response(build_production_template(), "production-template.xlsx")


@router.get("/production/excel/export")
def export_production_excel(db: Session = Depends(get_db)):
    records = [to_production_read(log, equipment) for log, equipment in crud.list_production_logs(db)]
    return _excel_response(build_production_export(records), "production-export.xlsx")


@router.post("/production/excel/import")
async def import_production_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员", "生产人员")),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只支持 .xlsx 文件")

    records = parse_production_import(await file.read())
    created_count = 0
    skipped_count = 0

    for equipment_code, production in records:
        equipment = crud.get_equipment_by_code(db, equipment_code)
        if equipment is None:
            skipped_count += 1
            continue
        crud.create_production_log(db, equipment, production)
        created_count += 1

    return {
        "created_count": created_count,
        "skipped_count": skipped_count,
        "total_count": len(records),
    }


@router.post("/equipment/{equipment_id}/production", response_model=schemas.EquipmentProductionLogRead)
def create_production_log(
    equipment_id: int,
    production: schemas.EquipmentProductionCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员", "生产人员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.create_production_log(db, equipment, production)
    return to_production_read(log, equipment)


@router.put("/production/{production_id}", response_model=schemas.EquipmentProductionLogRead)
def update_production_log(
    production_id: int,
    production: schemas.EquipmentProductionUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员", "生产人员")),
):
    production_log = crud.get_production_log(db, production_id)
    if production_log is None:
        raise HTTPException(status_code=404, detail="生产记录不存在")
    equipment = crud.get_equipment(db, production_log.equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.update_production_log(db, production_log, production)
    return to_production_read(log, equipment)


@router.get("/equipment/{equipment_id}/production-logs", response_model=list[schemas.EquipmentProductionLogRead])
def get_equipment_production_logs(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return [to_production_read(log, equipment_row) for log, equipment_row in crud.list_equipment_production_logs(db, equipment_id)]
