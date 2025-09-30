# app/models/transaction_models.py
from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field


# 공통 필드
class TransactionBase(SQLModel):
    # 거래 유저 아이디 (현재 문서 테이블의 사용자/상대 컬럼을 FK로 사용 중)
    transaction_user_id: int = Field(foreign_key="documents.document_user_id", index=True, nullable=False)

    # 거래 상대 아이디
    transaction_partner_id: int = Field(foreign_key="documents.document_partner_id", index=True, nullable=False)

    # 거래 제목
    transaction_title: str = Field(nullable=False)

    # 거래 금액 (음수 방지)
    transaction_balance: int = Field(ge=0, nullable=False)

    # 거래 만료일/시각 (기본: 현재시각 + 240초)
    transaction_due: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(seconds=600), nullable=False, index=True)

    # 거래 완료 여부
    transaction_close: bool = Field(default=False, nullable=False, index=True)
    
    # 거래 반복 여부
    transaction_recurring: bool = Field(default=False, nullable=False, index=True)


# 테이블 모델
class Transaction(TransactionBase, table=True):
    __tablename__ = "transactions"

    # 거래 아이디 (PK)
    transaction_id: Optional[int] = Field(default=None, primary_key=True, index=True)

    # 만든 시각 (한국 시간)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=9), nullable=False)


# 생성 요청 모델
class TransactionCreate(TransactionBase):
    # transaction_due는 서비스에서 자동으로 설정되므로 Optional로 오버라이드
    transaction_due: Optional[datetime] = None

# 부분 수정 모델
class TransactionUpdate(SQLModel):
    transaction_user_id: Optional[int] = None
    transaction_partner_id: Optional[int] = None
    transaction_title: Optional[str] = None
    transaction_balance: Optional[int] = Field(default=None, ge=0)
    transaction_due: Optional[datetime] = None
    transaction_close: Optional[bool] = None
    transaction_recurring: Optional[bool] = None
