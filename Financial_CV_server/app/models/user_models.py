from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "users"

    # 기본키
    user_id: Optional[int] = Field(default=None, primary_key=True, index=True, description="사용자 아이디")

    # 프로필
    user_name: str = Field(nullable=False, description="사용자 이름")

    # 로그인 정보
    user_login_id: str = Field(nullable=False, index=True, unique=True, description="사용자 로그인 아이디")
    user_login_pw: str = Field(nullable=False, description="사용자 로그인 비밀번호 해시")

    # 보안/상태
    user_failed_count: int = Field(default=0, nullable=False, description="사용자 로그인 실패 횟수")
    user_locked: bool = Field(default=False, nullable=False, description="사용자 계정 잠금 여부")

    # 생성 시각(한국 시간)
    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(hours=9),
        nullable=False,
        description="만든 시각(한국 시간)",
    )
