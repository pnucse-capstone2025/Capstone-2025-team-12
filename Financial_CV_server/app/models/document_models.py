from datetime import datetime, date, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field

class Document(SQLModel, table=True):
    __tablename__ = "documents"

    # 문서 아이디
    document_id: Optional[int] = Field(default=None, primary_key=True, index=True)

    # 사용자 아이디(문서 주인 식별)
    document_user_id: int = Field(foreign_key="users.user_id", index=True, nullable=False)

    # 문서 제목
    document_title: str = Field(nullable=False)

    # 문서에 기재된 금액
    document_balance: int = Field(nullable=False)

    # 문서에 기재된 거래 대상
    document_partner: str = Field(nullable=False)

    # 문서 처리에 연결된 은행
    document_bank: str = Field(nullable=False)

    # 문서 처리에 연결된 계좌
    document_account_number: str = Field(nullable=False)

    # 문서에 기재된 거래 대상 계좌
    document_partner_number: str = Field(nullable=False)

    # 문서에 기재된 만기일
    document_due: date = Field(nullable=False)

    # 만든 시각 (한국 시간)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=9))

    # 문서 분류 아이디
    document_classification_id: int = Field(index=True, nullable=False)
    
    # 문서에 기재된 거래 대상 아이디
    document_partner_id: int = Field(index=True,nullable=False)
    
    # 문서 내용 요약 - OCR 결과가 여기 삽입
    document_content: Optional[str] = Field(default=None, nullable=True)
    
    # 문서 파일 경로
    document_path: Optional[str] = Field(default=None, nullable=True)