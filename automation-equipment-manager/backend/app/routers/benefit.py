from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user, require_roles


router = APIRouter(prefix="/benefit-analysis", tags=["效益分析"], dependencies=[Depends(get_current_user)])


def _round(value: float | None, digits: int = 2):
    if value is None:
        return None
    return round(value, digits)


def _get_equipment_or_404(db: Session, equipment_id: int):
    equipment = (
        db.query(models.Equipment)
        .filter(models.Equipment.id == equipment_id, models.Equipment.is_deleted.is_(False))
        .first()
    )
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    return equipment


def _get_config_or_404(db: Session, config_id: int):
    config = db.query(models.EquipmentBenefitAnalysisConfig).filter(models.EquipmentBenefitAnalysisConfig.id == config_id).first()
    if config is None:
        raise HTTPException(status_code=404, detail="效益分析记录不存在")
    return config


def _config_to_read(config, equipment):
    data = schemas.BenefitConfigRead.model_validate(config).model_dump()
    data["equipment_code"] = equipment.equipment_code if equipment else None
    data["equipment_name"] = equipment.equipment_name if equipment else None
    data["equipment_type"] = equipment.equipment_type if equipment else None
    return data


def _list_config_rows(db: Session):
    return (
        db.query(models.EquipmentBenefitAnalysisConfig, models.Equipment)
        .join(models.Equipment, models.EquipmentBenefitAnalysisConfig.equipment_id == models.Equipment.id)
        .filter(models.Equipment.is_deleted.is_(False))
        .order_by(models.EquipmentBenefitAnalysisConfig.updated_at.desc())
        .all()
    )


def _ensure_unique_config(db: Session, payload: schemas.BenefitConfigBase, current_id: int | None = None):
    duplicate = (
        db.query(models.EquipmentBenefitAnalysisConfig)
        .filter(
            models.EquipmentBenefitAnalysisConfig.equipment_id == payload.equipment_id,
            models.EquipmentBenefitAnalysisConfig.product_code == payload.product_code,
            models.EquipmentBenefitAnalysisConfig.process_name == payload.process_name,
        )
        .first()
    )
    if duplicate and duplicate.id != current_id:
        raise HTTPException(status_code=400, detail="同一设备、产品货号和工序的效益分析记录已存在")


def _calculate_item(config, equipment):
    manual_labor_hours = config.monthly_output_qty * config.manual_minutes_per_unit * config.manual_worker_count / 60
    automation_labor_hours = config.monthly_output_qty * config.automation_minutes_per_unit * config.automation_worker_count / 60
    time_saved_hours = max(manual_labor_hours - automation_labor_hours, 0)
    saved_worker_count = max(config.manual_worker_count - config.automation_worker_count, 0)
    efficiency_improvement_rate = (
        (config.manual_minutes_per_unit / config.automation_minutes_per_unit - 1) * 100
        if config.automation_minutes_per_unit > 0
        else 0
    )
    monthly_labor_saving = time_saved_hours * config.labor_cost_per_hour
    monthly_depreciation_cost = config.investment_amount / config.depreciation_months if config.investment_amount else 0
    monthly_equipment_cost = monthly_depreciation_cost + config.monthly_maintenance_cost + config.monthly_energy_cost
    monthly_net_benefit = monthly_labor_saving - monthly_equipment_cost
    payback_months = config.investment_amount / monthly_net_benefit if config.investment_amount and monthly_net_benefit > 0 else None

    return {
        "config_id": config.id,
        "equipment_id": equipment.id,
        "equipment_code": equipment.equipment_code,
        "equipment_name": equipment.equipment_name,
        "equipment_type": equipment.equipment_type,
        "current_status": equipment.current_status,
        "product_code": config.product_code,
        "product_name": config.product_name,
        "process_name": config.process_name,
        "monthly_output_qty": config.monthly_output_qty,
        "investment_amount": _round(config.investment_amount),
        "manual_minutes_per_unit": _round(config.manual_minutes_per_unit),
        "manual_worker_count": _round(config.manual_worker_count),
        "automation_minutes_per_unit": _round(config.automation_minutes_per_unit),
        "automation_worker_count": _round(config.automation_worker_count),
        "saved_worker_count": _round(saved_worker_count),
        "labor_cost_per_hour": _round(config.labor_cost_per_hour),
        "monthly_maintenance_cost": _round(config.monthly_maintenance_cost),
        "monthly_energy_cost": _round(config.monthly_energy_cost),
        "manual_labor_hours": _round(manual_labor_hours),
        "automation_labor_hours": _round(automation_labor_hours),
        "time_saved_hours": _round(time_saved_hours),
        "efficiency_improvement_rate": _round(max(efficiency_improvement_rate, 0)),
        "monthly_labor_saving": _round(monthly_labor_saving),
        "monthly_depreciation_cost": _round(monthly_depreciation_cost),
        "monthly_equipment_cost": _round(monthly_equipment_cost),
        "monthly_net_benefit": _round(monthly_net_benefit),
        "payback_months": _round(payback_months),
        "estimate_basis": "按效益分析表录入数据计算",
    }


@router.get("/configs")
def list_benefit_configs(db: Session = Depends(get_db)):
    return [_config_to_read(config, equipment) for config, equipment in _list_config_rows(db)]


@router.post("/configs", status_code=status.HTTP_201_CREATED)
def create_benefit_config(
    payload: schemas.BenefitConfigCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = _get_equipment_or_404(db, payload.equipment_id)
    _ensure_unique_config(db, payload)
    config = models.EquipmentBenefitAnalysisConfig(**payload.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return _config_to_read(config, equipment)


@router.put("/configs/{config_id}")
def update_benefit_config(
    config_id: int,
    payload: schemas.BenefitConfigUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    equipment = _get_equipment_or_404(db, payload.equipment_id)
    config = _get_config_or_404(db, config_id)
    _ensure_unique_config(db, payload, current_id=config.id)
    for key, value in payload.model_dump().items():
        setattr(config, key, value)
    config.updated_at = models.utc_now()
    db.commit()
    db.refresh(config)
    return _config_to_read(config, equipment)


@router.delete("/configs/{config_id}")
def delete_benefit_config(
    config_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("管理员", "技术员")),
):
    config = _get_config_or_404(db, config_id)
    db.delete(config)
    db.commit()
    return {"deleted": True}


@router.get("")
def get_benefit_analysis(db: Session = Depends(get_db)):
    config_rows = [
        (config, equipment)
        for config, equipment in _list_config_rows(db)
        if config.is_active
    ]
    items = [_calculate_item(config, equipment) for config, equipment in config_rows]
    items.sort(key=lambda item: item["monthly_net_benefit"], reverse=True)

    totals = {
        "monthly_output_qty": sum(item["monthly_output_qty"] for item in items),
        "manual_labor_hours": sum(item["manual_labor_hours"] for item in items),
        "automation_labor_hours": sum(item["automation_labor_hours"] for item in items),
        "time_saved_hours": sum(item["time_saved_hours"] for item in items),
        "monthly_labor_saving": sum(item["monthly_labor_saving"] for item in items),
        "monthly_depreciation_cost": sum(item["monthly_depreciation_cost"] for item in items),
        "monthly_equipment_cost": sum(item["monthly_equipment_cost"] for item in items),
        "monthly_net_benefit": sum(item["monthly_net_benefit"] for item in items),
    }
    average_efficiency_rate = (
        (totals["manual_labor_hours"] / totals["automation_labor_hours"] - 1) * 100
        if totals["automation_labor_hours"] > 0
        else 0
    )
    positive_payback_items = [item["payback_months"] for item in items if item["payback_months"] is not None]
    average_payback_months = sum(positive_payback_items) / len(positive_payback_items) if positive_payback_items else None

    return {
        "summary": {
            "config_count": len(items),
            "monthly_output_qty": totals["monthly_output_qty"],
            "total_manual_labor_hours": _round(totals["manual_labor_hours"]),
            "total_automation_labor_hours": _round(totals["automation_labor_hours"]),
            "total_time_saved_hours": _round(totals["time_saved_hours"]),
            "average_efficiency_improvement_rate": _round(max(average_efficiency_rate, 0)),
            "monthly_labor_saving": _round(totals["monthly_labor_saving"]),
            "monthly_depreciation_cost": _round(totals["monthly_depreciation_cost"]),
            "monthly_equipment_cost": _round(totals["monthly_equipment_cost"]),
            "monthly_net_benefit": _round(totals["monthly_net_benefit"]),
            "average_payback_months": _round(average_payback_months),
        },
        "best_items": items[:8],
        "longest_payback_items": sorted(
            [item for item in items if item["payback_months"] is not None],
            key=lambda item: item["payback_months"],
            reverse=True,
        )[:8],
        "items": items,
    }
