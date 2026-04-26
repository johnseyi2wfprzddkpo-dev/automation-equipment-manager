from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app import models
from app.database import Base, UPLOAD_DIR, engine
from app.routers import auth, dashboard, equipment, location, maintenance, outsource, production, repair, status
from app.security import hash_password


def get_allowed_origins():
    origins = os.getenv("ALLOWED_ORIGINS")
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]
    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_full_name = os.getenv("ADMIN_FULL_NAME", "系统管理员")
        admin = db.query(models.User).filter(models.User.username == admin_username).first()
        if admin is None:
            db.add(
                models.User(
                    username=admin_username,
                    full_name=admin_full_name,
                    role="管理员",
                    password_hash=hash_password(admin_password),
                    is_active=True,
                )
            )
            db.commit()
    yield


app = FastAPI(
    title="华登集团自动化设备管理系统",
    description="华登集团自动化设备管理系统 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(equipment.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(location.router, prefix="/api")
app.include_router(outsource.router, prefix="/api")
app.include_router(production.router, prefix="/api")
app.include_router(repair.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
