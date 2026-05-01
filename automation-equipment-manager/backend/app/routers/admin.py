from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import require_roles


router = APIRouter(prefix="/admin", tags=["系统管理"])


EQUIPMENT_DATA_MODELS = [
    models.EquipmentImage,
    models.EquipmentMaintenanceLog,
    models.EquipmentRepairLog,
    models.EquipmentProductionLog,
    models.EquipmentOutsourceLog,
    models.EquipmentLocationLog,
    models.EquipmentStatusLog,
    models.Equipment,
]


@router.delete("/clear-equipment-data")
def clear_equipment_data(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员")),
):
    deleted_counts = {}
    for model in EQUIPMENT_DATA_MODELS:
        count = db.query(model).count()
        deleted_counts[model.__tablename__] = count
        db.query(model).delete(synchronize_session=False)
    db.commit()

    return {
        "message": "设备数据已清空",
        "deleted_counts": deleted_counts,
    }
