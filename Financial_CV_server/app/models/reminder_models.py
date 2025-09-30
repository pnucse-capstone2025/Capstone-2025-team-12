# app/models/reminder_models.py
from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field


class Reminder(SQLModel, table=True):
    __tablename__ = "reminders"

    # 라마인더 아이디 (PK)
    reminder_id: Optional[int] = Field(default=None, primary_key=True, index=True)

    # 라마인더 할 거래 아이디 (transactions.transaction_id 참조) -> 거래가 완료되지 않고 살아있다면, 계속 
    transaction_id: int = Field(foreign_key="transactions.transaction_id", index=True, nullable=False)
    
    # 라마인더의 계정 아이디 (users.user_id 참조)
    reminder_user_id: int = Field(foreign_key="users.user_id", index=True, nullable=False)

    # 리마인더 제목
    reminder_title: str = Field(nullable=False)

    # 만기일/알림 시각 (UTC 권장)
    due_at: datetime = Field(nullable=False, index=True)

    # 상태(거래 완료 시 True로 두어 알림 로직에서 제외)
    status: bool = Field(default=False, nullable=False, index=True)

    # 만든 시각 (한국 시간)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=9), nullable=False)
