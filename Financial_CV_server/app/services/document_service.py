# app/services/document_service.py
from typing import List, Optional, Dict
from datetime import date
from fastapi import HTTPException, status
from sqlmodel import Session, select, SQLModel

from app.models.document_models import Document

# ----------------------------
# 요청 스키마 (Create / Update)
# ----------------------------
class DocumentCreate(SQLModel):
    document_user_id: int
    document_title: str
    document_balance: int
    document_partner: str
    document_bank: str
    document_account_number: str
    document_partner_number: str
    document_due: date
    document_classification_id: int
    document_content: Optional[str] = None
    document_partner_id: Optional[int] = None
    document_path: Optional[str] = None

class DocumentUpdate(SQLModel):
    document_user_id: Optional[int] = None
    document_title: Optional[str] = None
    document_balance: Optional[int] = None
    document_partner: Optional[str] = None
    document_bank: Optional[str] = None
    document_account_number: Optional[str] = None
    document_partner_number: Optional[str] = None
    document_due: Optional[date] = None
    document_classification_id: Optional[int] = None
    document_content: Optional[str] = None
    document_partner_id: Optional[int] = None
    document_path: Optional[str] = None

# ----------------------------
# 단건 조회
# ----------------------------
def get_document_by_id(session: Session, document_id: int) -> Document:
    """document_id로 document 검색"""
    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document

# ----------------------------
# 전체 목록
# ----------------------------
def get_all_documents(session: Session) -> List[Document]:
    """전체 document 출력"""
    return session.exec(select(Document)).all()

# ----------------------------
# 사용자별 목록
# ----------------------------
def get_documents_by_user_id(session: Session, document_user_id: int) -> List[Document]:
    """user_id의 document 정보들 출력"""
    stmt = select(Document).where(Document.document_user_id == document_user_id)
    return session.exec(stmt).all()

# ----------------------------
# 사용자 + 분류별 목록
# ----------------------------
def get_documents_by_user_and_classification(
    session: Session,
    document_user_id: int,
    document_classification_id: int,
) -> List[Document]:
    """document_user_id와 document_classification_id로 검색"""
    stmt = select(Document).where(
        (Document.document_user_id == document_user_id)
        & (Document.document_classification_id == document_classification_id)
    )
    return session.exec(stmt).all()

# ----------------------------
# 생성
# ----------------------------
def create_document(session: Session, doc_to_create: DocumentCreate) -> Document:
    """document 추가 (모든 필드 필수, created_at 자동)"""
    # 모든 필드가 비NULL이므로 Create 스키마의 값으로 그대로 생성
    db_document = Document(**doc_to_create.model_dump())
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document

# ----------------------------
# 수정
# ----------------------------
def update_document(
    session: Session,
    document_id: int,
    doc_to_update: DocumentUpdate,
) -> Document:
    """document_id로 document 수정 (부분 업데이트 허용)"""
    db_document = get_document_by_id(session, document_id)

    update_data = doc_to_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_document, key, value)

    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document

# ----------------------------
# 삭제
# ----------------------------
def delete_document(session: Session, document_id: int) -> Dict[str, str]:
    """document_id로 document 삭제"""
    db_document = get_document_by_id(session, document_id)
    session.delete(db_document)
    session.commit()
    return {"message": "Document deleted successfully"}

# ==============================================================
# document_content 전용 함수들 (설정 / 삭제 / 확인)
# ==============================================================
def set_document_content(session: Session, document_id: int, content: str) -> Document:
    """
    document_content 설정
    - 공백/빈 문자열은 허용하지 않음(명확성을 위해); 삭제는 clear_document_content 사용
    """
    if content is None or content.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content is empty. Use clear_document_content to remove content.",
        )

    db_document = get_document_by_id(session, document_id)
    db_document.document_content = content
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document

def clear_document_content(session: Session, document_id: int) -> Document:
    """document_content를 None으로 초기화(삭제)"""
    db_document = get_document_by_id(session, document_id)
    db_document.document_content = None
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document

def get_document_content(session: Session, document_id: int) -> Optional[str]:
    """document_content만 조회(확인)"""
    db_document = get_document_by_id(session, document_id)
    return db_document.document_content