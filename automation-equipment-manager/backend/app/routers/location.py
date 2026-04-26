from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.security import get_current_user, require_roles


router = APIRouter(prefix="/equipment", tags=["位置管理"], dependencies=[Depends(get_current_user)])


@router.post("/{equipment_id}/location", response_model=schemas.EquipmentLocationLogRead)
def update_equipment_location(
    equipment_id: int,
    location_update: schemas.EquipmentLocationUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return crud.update_equipment_location(db, equipment, location_update)


@router.get("/{equipment_id}/location-logs", response_model=list[schemas.EquipmentLocationLogRead])
def get_equipment_location_logs(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return crud.list_equipment_location_logs(db, equipment_id)
