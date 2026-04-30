from sqlite3 import IntegrityError as SQLiteIntegrityError
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import UPLOAD_DIR, get_db
from app.security import get_current_user, require_roles
from app.utils.excel import build_equipment_export, build_equipment_template, parse_equipment_import, parse_equipment_ledger_import
from app.utils.enums import EQUIPMENT_STATUSES


router = APIRouter(prefix="/equipment", tags=["设备台账"], dependencies=[Depends(get_current_user)])
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


@router.get("/statuses")
def get_equipment_statuses():
    return EQUIPMENT_STATUSES


@router.get("", response_model=list[schemas.EquipmentRead])
def list_equipment(
    status_filter: str | None = Query(default=None, alias="status"),
    equipment_type: str | None = None,
    location: str | None = None,
    manager: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
):
    return crud.list_equipment(
        db=db,
        status=status_filter,
        equipment_type=equipment_type,
        location=location,
        manager=manager,
        keyword=keyword,
    )


def _excel_response(stream, filename: str):
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/excel/template")
def download_equipment_template(_user=Depends(require_roles("管理员"))):
    return _excel_response(build_equipment_template(), "equipment-template.xlsx")


@router.get("/excel/export")
def export_equipment_excel(
    status_filter: str | None = Query(default=None, alias="status"),
    equipment_type: str | None = None,
    location: str | None = None,
    manager: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
):
    equipment_list = crud.list_equipment(
        db=db,
        status=status_filter,
        equipment_type=equipment_type,
        location=location,
        manager=manager,
        keyword=keyword,
    )
    return _excel_response(build_equipment_export(equipment_list), "equipment-export.xlsx")


@router.post("/excel/import")
async def import_equipment_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员")),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只支持 .xlsx 文件")

    records = parse_equipment_import(await file.read())
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for record in records:
        existing = crud.get_equipment_by_code(db, record.equipment_code)
        try:
            if existing:
                crud.update_equipment(db, existing, schemas.EquipmentUpdate(**record.model_dump()))
                updated_count += 1
            else:
                crud.create_equipment(db, record)
                created_count += 1
        except (IntegrityError, SQLiteIntegrityError):
            db.rollback()
            skipped_count += 1

    return {
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "total_count": len(records),
    }


@router.post("/import-excel")
async def import_equipment_ledger_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员")),
):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只支持 .xlsx 文件")

    parsed = parse_equipment_ledger_import(await file.read())
    created_count = 0
    updated_count = 0
    failures = list(parsed["failures"])

    for item in parsed["records"]:
        row_number = item["row_number"]
        record = item["equipment"]
        existing = crud.get_equipment_by_code(db, record.equipment_code)
        try:
            if existing:
                crud.update_equipment(db, existing, schemas.EquipmentUpdate(**record.model_dump()))
                updated_count += 1
            else:
                crud.create_equipment(db, record)
                created_count += 1
        except Exception as exc:
            db.rollback()
            failures.append({"row_number": row_number, "reason": f"写入失败：{exc}"})

    return {
        "total_count": parsed["total_count"],
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": parsed["skipped_count"],
        "failed_count": len(failures),
        "failures": failures,
    }


@router.get("/{equipment_id}/images", response_model=list[schemas.EquipmentImageRead])
def list_equipment_images(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return crud.list_equipment_images(db, equipment_id)


@router.post("/{equipment_id}/images", response_model=schemas.EquipmentImageRead, status_code=status.HTTP_201_CREATED)
async def upload_equipment_image(
    equipment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="只支持 JPG、PNG、WEBP、GIF 图片")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="图片文件不能为空")
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="图片大小不能超过 5MB")

    original_filename = Path(file.filename or "equipment-image").name
    stored_filename = f"{uuid4().hex}{ALLOWED_IMAGE_TYPES[content_type]}"
    target_path = UPLOAD_DIR / stored_filename
    target_path.write_bytes(content)

    return crud.create_equipment_image(
        db=db,
        equipment_id=equipment.id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        file_size=len(content),
        url=f"/uploads/{stored_filename}",
    )


@router.delete("/{equipment_id}/images/{image_id}", response_model=schemas.EquipmentImageRead)
def delete_equipment_image(
    equipment_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")

    image = crud.get_equipment_image(db, image_id)
    if image is None or image.equipment_id != equipment_id:
        raise HTTPException(status_code=404, detail="图片不存在")

    target_path = UPLOAD_DIR / image.stored_filename
    deleted = crud.delete_equipment_image(db, image)
    if target_path.exists():
        target_path.unlink()
    return deleted


@router.post("", response_model=schemas.EquipmentRead, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment: schemas.EquipmentCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员")),
):
    if crud.get_equipment_by_code(db, equipment.equipment_code):
        raise HTTPException(status_code=400, detail="设备编号已存在")

    try:
        return crud.create_equipment(db, equipment)
    except (IntegrityError, SQLiteIntegrityError):
        db.rollback()
        raise HTTPException(status_code=400, detail="设备编号已存在")


@router.get("/{equipment_id}", response_model=schemas.EquipmentRead)
def get_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return equipment


@router.put("/{equipment_id}", response_model=schemas.EquipmentRead)
def update_equipment(
    equipment_id: int,
    equipment_update: schemas.EquipmentUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")

    same_code = crud.get_equipment_by_code(db, equipment_update.equipment_code)
    if same_code and same_code.id != equipment_id:
        raise HTTPException(status_code=400, detail="设备编号已存在")

    try:
        return crud.update_equipment(db, equipment, equipment_update)
    except (IntegrityError, SQLiteIntegrityError):
        db.rollback()
        raise HTTPException(status_code=400, detail="设备编号已存在")


@router.delete("/{equipment_id}", response_model=schemas.EquipmentRead)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return crud.soft_delete_equipment(db, equipment)
