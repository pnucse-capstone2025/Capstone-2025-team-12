from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field

class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    # 계좌 아이디
    account_id: Optional[int] = Field(default=None, primary_key=True, index=True)        

    # 계좌 잔액
    account_balance: int = Field(default=0, nullable=False)                          

    # 계좌 은행
    account_bank: str = Field(nullable=False)                                            

    # 계좌 주인 아이디
    account_user_id: int = Field(foreign_key="users.user_id", index=True, nullable=False) 

    # 계좌 번호
    account_number: str = Field(nullable=False, unique=True, index=True)                 

    # 만든 시각 (한국 시간)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=9))                        

    # 계좌 사용 횟수
    account_count: int = Field(default=0, nullable=False)                                
