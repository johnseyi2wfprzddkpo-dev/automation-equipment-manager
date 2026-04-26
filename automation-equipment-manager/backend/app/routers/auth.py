from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import create_access_token, get_current_user, hash_password, require_roles, verify_password


router = APIRouter(prefix="/auth", tags=["登录权限"])


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
