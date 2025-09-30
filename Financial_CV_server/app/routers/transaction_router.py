# app/routers/transaction_router.py
from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.models.transaction_models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
)
from app.services.transaction_service import (
    list_transactions,
    list_transactions_by_user,
    create_transaction,
    update_transaction,
    delete_transaction,
    update_transaction_recurring,
    get_transaction_by_id,
)
from app.dependencies.transaction_db import get_transaction_session  # DB 세션 의존성


router = APIRouter(prefix="/transactions", tags=["transactions"])


# -----------------------------
# 모든 거래 조회
# -----------------------------
@router.get("/", response_model=List[Transaction])
def api_list_transactions(session: Session = Depends(get_transaction_session)) -> List[Transaction]:
    """모든 거래를 최신순으로 조회"""
    return list_transactions(session)


# -----------------------------
# 특정 유저의 거래만 조회
# -----------------------------
@router.get("/user/{transaction_user_id}", response_model=List[Transaction])
def api_list_transactions_by_user(
    transaction_user_id: int,
    session: Session = Depends(get_transaction_session),
) -> List[Transaction]:
    """거래 유저 아이디로만 필터링하여 조회"""
    return list_transactions_by_user(session, transaction_user_id)


# -----------------------------
# 특정 거래의 정보만 조회
# -----------------------------
@router.get("/{transaction_id}", response_model=Transaction)
def api_get_transaction_by_id(
    transaction_id: int,
    session: Session = Depends(get_transaction_session),
) -> Transaction:
    """거래 ID로 단건 조회"""
    return get_transaction_by_id(session, transaction_id)


# -----------------------------
# 거래 생성
# -----------------------------
@router.post("/", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def api_create_transaction(
    payload: TransactionCreate,
    session: Session = Depends(get_transaction_session),
) -> Transaction:
    """거래 내역 생성"""
    return create_transaction(session, payload)


# -----------------------------
# 거래 수정 (부분 수정)
# -----------------------------
@router.patch("/{transaction_id}", response_model=Transaction)
def api_update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    session: Session = Depends(get_transaction_session),
) -> Transaction:
    """거래 내역 수정"""
    return update_transaction(session, transaction_id, payload)


# -----------------------------
# 거래 삭제
# -----------------------------
@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_transaction_session),
) -> None:
    """거래 내역 삭제"""
    delete_transaction(session, transaction_id)
    return None


# -----------------------------
# 거래 주기 갱신 (30분 연장)
# -----------------------------
@router.patch("/{transaction_id}/recurring", response_model=Transaction)
def api_update_transaction_recurring(
    transaction_id: int,
    session: Session = Depends(get_transaction_session),
) -> Transaction:
    """거래 주기 갱신 - transaction_due를 30분 뒤로 연장"""
    return update_transaction_recurring(session, transaction_id)
