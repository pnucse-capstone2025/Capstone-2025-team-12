from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from datetime import datetime
import json

from app.models.user_models import User
from app.dependencies.user_db import get_user_session
from app.dependencies.jwt_db import JWTUtil
from app.dependencies.redis_db import get_redis
from app.services.user_service import (
    register_user,
    get_user_by_id,
    list_users,
    update_user,
    delete_user,
    signin,
)

router = APIRouter(prefix="/users", tags=["users"])

# ----------------------------
# Pydantic 요청/응답 모델
# ----------------------------

class UserCreateModel(BaseModel):
    user_name: str
    user_login_id: str
    password: str

class UserUpdateModel(BaseModel):
    user_name: Optional[str] = None
    user_login_id: Optional[str] = None
    password: Optional[str] = None
    user_locked: Optional[bool] = None
    user_failed_count: Optional[int] = None

class UserLoginModel(BaseModel):
    user_login_id: str
    password: str

class UserResponseModel(BaseModel):
    user_id: int
    user_name: str
    user_login_id: str
    created_at: datetime
    access_token: Optional[str] = None

    class Config:
        orm_mode = True  # SQLModel → Pydantic 변환 허용

# ----------------------------
# 사용자 API
# ----------------------------

@router.post("/register", response_model=UserResponseModel, status_code=status.HTTP_201_CREATED)
def api_register_user(
    user_in: UserCreateModel,
    session: Session = Depends(get_user_session),
    jwtUtil: JWTUtil = Depends(),
    redisDB = Depends(get_redis),
) -> UserResponseModel:
    # 1) DB 저장
    user = register_user(
        session=session,
        user_name=user_in.user_name,
        user_login_id=user_in.user_login_id,
        password=user_in.password,
    )

    # 2) JWT 발급
    token = jwtUtil.create_token({
        "user_id": user.user_id,
        "user_login_id": user.user_login_id,
        "user_name": user.user_name,
    })

    # 3) Redis 저장(1시간 TTL) -> 5분으로 수정
    redis_key = f"user:{user.user_id}"
    redisDB.setex(redis_key, 300, json.dumps({
        "user_id": user.user_id,
        "user_login_id": user.user_login_id,
        "user_name": user.user_name,
        "created_at": user.created_at.isoformat(),
        "access_token": token,
    }))

    return UserResponseModel(
        user_id=user.user_id,
        user_name=user.user_name,
        user_login_id=user.user_login_id,
        created_at=user.created_at,
        access_token=token,
    )

@router.get("/", response_model=List[UserResponseModel])
def api_list_users(session: Session = Depends(get_user_session)) -> List[User]:
    return list_users(session)

@router.get("/{user_id}", response_model=UserResponseModel)
def api_get_user(
    user_id: int,
    session: Session = Depends(get_user_session),
) -> User:
    return get_user_by_id(session, user_id)

@router.put("/{user_id}", response_model=UserResponseModel)
def api_update_user(
    user_id: int,
    user_in: UserUpdateModel,
    session: Session = Depends(get_user_session),
) -> User:
    return update_user(
        session=session,
        user_id=user_id,
        user_name=user_in.user_name,
        user_login_id=user_in.user_login_id,
        password=user_in.password,
        user_locked=user_in.user_locked,
        user_failed_count=user_in.user_failed_count,
    )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_user(
    user_id: int,
    session: Session = Depends(get_user_session),
) -> None:
    delete_user(session, user_id)

# ----------------------------
# 로그인
# ----------------------------

@router.post("/login", response_model=UserResponseModel)
def api_user_login(
    login_data: UserLoginModel,
    session: Session = Depends(get_user_session),
    jwtUtil: JWTUtil = Depends(),
    redisDB = Depends(get_redis),
) -> UserResponseModel:
    user = signin(session, login_data.user_login_id, login_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="로그인 실패")

    token = jwtUtil.create_token({
        "user_id": user.user_id,
        "user_login_id": user.user_login_id,
        "user_name": user.user_name,
    })

    redis_key = f"user:{user.user_id}"
    redisDB.setex(redis_key, 3600, json.dumps({
        "user_id": user.user_id,
        "user_login_id": user.user_login_id,
        "user_name": user.user_name,
        "created_at": user.created_at.isoformat(),
        "access_token": token,
    }))

    return UserResponseModel(
        user_id=user.user_id,
        user_name=user.user_name,
        user_login_id=user.user_login_id,
        created_at=user.created_at,
        access_token=token,
    )
