from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import create_access_token, get_current_user, hash_password, require_roles, verify_password


router = APIRouter(prefix="/auth", tags=["登录权限"])

ADMIN_ROLE = schemas.USER_ROLES[0]


def get_user_or_404(user_id: int, db: Session):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return user


def count_active_admins(db: Session) -> int:
    return (
        db.query(models.User)
        .filter(models.User.role == ADMIN_ROLE, models.User.is_active.is_(True))
        .count()
    )


def is_last_active_admin(user: models.User, db: Session) -> bool:
    return user.role == ADMIN_ROLE and user.is_active and count_active_admins(db) <= 1


@router.post("/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == login_data.username).first()
    if user is None or not user.is_active or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    return {"access_token": create_access_token(user), "user": user}


@router.get("/me", response_model=schemas.UserRead)
def get_me(user: models.User = Depends(get_current_user)):
    return user


@router.get("/users", response_model=list[schemas.UserRead])
def list_users(
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_roles("管理员")),
):
    return db.query(models.User).order_by(models.User.id.asc()).all()


@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(require_roles("管理员")),
):
    exists = db.query(models.User).filter(models.User.username == user_data.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = models.User(
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role,
        password_hash=hash_password(user_data.password),
        is_active=user_data.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("管理员")),
):
    user = get_user_or_404(user_id, db)
    will_remove_admin_permission = user_data.role != ADMIN_ROLE
    will_disable = not user_data.is_active

    if user.id == current_user.id and (will_remove_admin_permission or will_disable):
        raise HTTPException(status_code=400, detail="不能禁用自己或移除自己的管理员权限")

    if is_last_active_admin(user, db) and (will_remove_admin_permission or will_disable):
        raise HTTPException(status_code=400, detail="不能禁用或降级最后一个管理员")

    user.full_name = user_data.full_name
    user.role = user_data.role
    user.is_active = user_data.is_active
    user.updated_at = models.utc_now()
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("管理员")),
):
    user = get_user_or_404(user_id, db)
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能删除当前登录用户")
    if is_last_active_admin(user, db):
        raise HTTPException(status_code=400, detail="不能删除最后一个管理员")

    db.delete(user)
    db.commit()
    return {"deleted": True}
