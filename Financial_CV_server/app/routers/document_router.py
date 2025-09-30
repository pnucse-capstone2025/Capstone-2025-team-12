# app/routers/document_router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlmodel import Session

from app.models.document_models import Document
from app.dependencies.document_db import get_document_session
from app.services.document_service import (
    create_document,
    get_all_documents,
    get_document_by_id,
    get_documents_by_user_id,
    get_documents_by_user_and_classification,
    update_document,
    delete_document,
    
    # content 전용 메서드
    set_document_content,
    clear_document_content,
    get_document_content,
    
    # 스키마
    DocumentCreate,   # 생성 요청 스키마 (모든 필드 필수, created_at 제외)
    DocumentUpdate,   # 수정 요청 스키마 (부분 수정용)
)

router = APIRouter(prefix="/documents", tags=["documents"])

# ----------------------------
# Content 전용 요청/응답 모델
# ----------------------------
class DocumentContentUpdate(BaseModel):
    document_content: str

class DocumentContentResponse(BaseModel):
    document_id: int
    document_content: Optional[str] = None


# 전체 조회 + 조건 필터
@router.get("/", response_model=List[Document])
def api_get_documents(
    session: Session = Depends(get_document_session),
    document_user_id: Optional[int] = Query(None, description="필터링할 사용자 ID"),
    document_classification_id: Optional[int] = Query(None, description="필터링할 문서 분류 ID"),
) -> List[Document]:
    '''
        쿼리에 user_id가 없다면, classification_id가 동작을 하지 않습니다.\n
        user_id가 없다면, 애초에 필요한 기능이 아니라고 판단해서, 조건문을 아래와 같이 구성했습니다.\n
        classificatiom_id와 user_id를 쿼리에 같이 넣어야 조건문이 동작합니다.\n
    '''
    if (document_user_id is not None) and (document_classification_id is not None):
        return get_documents_by_user_and_classification(
            session=session,
            document_user_id=document_user_id,
            document_classification_id=document_classification_id,
        )
    if document_user_id is not None:
        return get_documents_by_user_id(session=session, document_user_id=document_user_id)
    return get_all_documents(session=session)

# 사용자별 조회
@router.get("/user/{document_user_id}", response_model=List[Document])
def api_get_documents_by_user(
    document_user_id: int,
    session: Session = Depends(get_document_session),
) -> List[Document]:
    return get_documents_by_user_id(session=session, document_user_id=document_user_id)

# 단건 조회
@router.get("/{document_id}", response_model=Document)
def api_get_document_by_id(
    document_id: int,
    session: Session = Depends(get_document_session),
) -> Document:
    return get_document_by_id(session=session, document_id=document_id)

# 생성
@router.post("/", response_model=Document, status_code=status.HTTP_201_CREATED)
def api_create_document(
    doc_in: DocumentCreate,
    session: Session = Depends(get_document_session),
) -> Document:
    return create_document(session=session, doc_to_create=doc_in)

# 수정
@router.put("/{document_id}", response_model=Document)
def api_update_document(
    document_id: int,
    doc_update_data: DocumentUpdate,
    session: Session = Depends(get_document_session),
) -> Document:
    return update_document(
        session=session,
        document_id=document_id,
        doc_to_update=doc_update_data,
    )

# 삭제
@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def api_delete_document(
    document_id: int,
    session: Session = Depends(get_document_session),
) -> dict:
    return delete_document(session=session, document_id=document_id)

# ================================
# ⬇️ document_content 전용 라우트
# ================================

# (1) 내용 확인
@router.get("/{document_id}/content", response_model=DocumentContentResponse)
def api_get_document_content(
    document_id: int,
    session: Session = Depends(get_document_session),
) -> DocumentContentResponse:
    content = get_document_content(session=session, document_id=document_id)
    return DocumentContentResponse(document_id=document_id, document_content=content)

# (2) 내용 설정(수정 포함)
@router.patch("/{document_id}/content", response_model=Document)
def api_set_document_content(
    document_id: int,
    payload: DocumentContentUpdate,
    session: Session = Depends(get_document_session),
) -> Document:
    return set_document_content(session=session, document_id=document_id, content=payload.document_content)

# (3) 내용 삭제(초기화)
@router.delete("/{document_id}/content", response_model=Document)
def api_clear_document_content(
    document_id: int,
    session: Session = Depends(get_document_session),
) -> Document:
    return clear_document_content(session=session, document_id=document_id)
