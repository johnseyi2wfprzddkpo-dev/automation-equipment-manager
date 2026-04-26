import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from secrets import token_hex

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.database import get_db


TOKEN_SECRET = os.getenv("AEM_TOKEN_SECRET", "change-this-secret-in-production")
TOKEN_EXPIRE_HOURS = 12
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return f"{salt}${base64.urlsafe_b64encode(digest).decode('utf-8')}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, _digest = stored_hash.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored_hash)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(user: models.User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
        "exp": int(expires_at.timestamp()),
    }
    payload_part = _b64encode(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_part.encode("utf-8"), hashlib.sha256).digest()
    return f"{payload_part}.{_b64encode(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        payload_part, signature_part = token.split(".", 1)
        expected_signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_part.encode("utf-8"), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64encode(expected_signature), signature_part):
            raise ValueError("bad signature")
        payload = json.loads(_b64decode(payload_part).decode("utf-8"))
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("expired token")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效，请重新登录") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")

    payload = decode_access_token(credentials.credentials)
    user = (
        db.query(models.User)
        .filter(models.User.id == payload.get("user_id"), models.User.is_active.is_(True))
        .first()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在或已停用")
    return user


def require_roles(*roles: str):
    def dependency(user: models.User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号没有权限执行该操作")
        return user

    return dependency

