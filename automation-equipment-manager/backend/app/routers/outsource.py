from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.security import get_current_user, require_roles
from app.utils.excel import build_outsource_export, build_outsource_template, parse_outsource_import


router = APIRouter(tags=["外发管理"], dependencies=[Depends(get_current_user)])


def to_outsource_read(log, equipment):
    data = schemas.EquipmentOutsourceLogRead.model_validate(log).model_dump()
    data["equipment_code"] = equipment.equipment_code
    data["equipment_name"] = equipment.equipment_name
    data["is_overdue"] = (
        log.actual_return_date is None
        and log.expected_return_date < date.today()
        and log.status == "外发中"
    )
    return data


def _excel_response(stream, filename: str):
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/outsource", response_model=list[schemas.EquipmentOutsourceLogRead])
def list_outsource_logs(db: Session = Depends(get_db)):
    return [to_outsource_read(log, equipment) for log, equipment in crud.list_outsource_logs(db)]


@router.get("/outsource/excel/template")
def download_outsource_template(_user=Depends(require_roles("管理员", "技术员"))):
    return _excel_response(build_outsource_template(), "outsource-template.xlsx")


@router.get("/outsource/excel/export")
def export_outsource_excel(db: Session = Depends(get_db)):
    records = [to_outsource_read(log, equipment) for log, equipment in crud.list_outsource_logs(db)]
    return _excel_response(build_outsource_export(records), "outsource-export.xlsx")


@router.post("/outsource/excel/import")
async def import_outsource_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只支持 .xlsx 文件")

    records = parse_outsource_import(await file.read())
    created_count = 0
    returned_count = 0
    skipped_count = 0

    for equipment_code, outsource, actual_return_date, return_status in records:
        equipment = crud.get_equipment_by_code(db, equipment_code)
        if equipment is None:
            skipped_count += 1
            continue
        log = crud.create_outsource_log(db, equipment, outsource)
        created_count += 1
        if actual_return_date:
            crud.return_outsource_log(
                db,
                log,
                equipment,
                schemas.EquipmentOutsourceReturn(
                    actual_return_date=actual_return_date,
                    new_status=return_status,
                    operator=outsource.operator,
                    remark=outsource.remark,
                ),
            )
            returned_count += 1

    return {
        "created_count": created_count,
        "returned_count": returned_count,
        "skipped_count": skipped_count,
        "total_count": len(records),
    }


@router.post("/equipment/{equipment_id}/outsource", response_model=schemas.EquipmentOutsourceLogRead)
def create_outsource_log(
    equipment_id: int,
    outsource: schemas.EquipmentOutsourceCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.create_outsource_log(db, equipment, outsource)
    return to_outsource_read(log, equipment)


@router.put("/outsource/{outsource_id}/return", response_model=schemas.EquipmentOutsourceLogRead)
def return_outsource_log(
    outsource_id: int,
    return_data: schemas.EquipmentOutsourceReturn,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    outsource_log = crud.get_outsource_log(db, outsource_id)
    if outsource_log is None:
        raise HTTPException(status_code=404, detail="外发记录不存在")
    if outsource_log.actual_return_date is not None:
        raise HTTPException(status_code=400, detail="该外发记录已返回")

    equipment = crud.get_equipment(db, outsource_log.equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    log = crud.return_outsource_log(db, outsource_log, equipment, return_data)
    return to_outsource_read(log, equipment)


@router.get("/equipment/{equipment_id}/outsource-logs", response_model=list[schemas.EquipmentOutsourceLogRead])
def get_equipment_outsource_logs(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return [to_outsource_read(log, equipment_row) for log, equipment_row in crud.list_equipment_outsource_logs(db, equipment_id)]
