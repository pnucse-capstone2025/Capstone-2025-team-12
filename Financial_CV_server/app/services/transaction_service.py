# app/services/transaction_service.py
from typing import List
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.transaction_models import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
)


# -----------------------------
# 조회
# -----------------------------
def list_transactions(session: Session) -> List[Transaction]:
    """모든 거래 조회 (최신순)."""
    stmt = select(Transaction).order_by(Transaction.created_at.desc())
    return session.exec(stmt).all()


def list_transactions_by_user(session: Session, transaction_user_id: int) -> List[Transaction]:
    """특정 유저의 거래만 조회 (최신순)."""
    stmt = (
        select(Transaction)
        .where(Transaction.transaction_user_id == transaction_user_id)
        .order_by(Transaction.created_at.desc())
    )
    return session.exec(stmt).all()


def get_transaction_by_id(session: Session, transaction_id: int) -> Transaction:
    """단건 조회(내부 사용)."""
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    return tx


# -----------------------------
# 생성
# -----------------------------
def create_transaction(session: Session, payload: TransactionCreate) -> Transaction:
    """거래 생성."""
    from datetime import datetime, timedelta
    
    # payload에서 데이터를 가져와서 transaction_due가 없으면 현재시간 + 10분으로 설정
    tx_data = payload.model_dump(exclude_unset=True)
    if 'transaction_due' not in tx_data or tx_data['transaction_due'] is None:
        # 한국 시간 (UTC+9) 사용
        korea_tz = timedelta(hours=9)
        tx_data['transaction_due'] = datetime.utcnow() + korea_tz + timedelta(minutes=10)
    
    tx = Transaction(**tx_data)
    session.add(tx)
    session.commit()
    session.refresh(tx)
    return tx


# -----------------------------
# 수정
# -----------------------------
def update_transaction(
    session: Session, transaction_id: int, payload: TransactionUpdate
) -> Transaction:
    """거래 수정(부분 수정)."""
    tx = get_transaction_by_id(session, transaction_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tx, field, value)

    session.add(tx)
    session.commit()
    session.refresh(tx)
    return tx


# -----------------------------
# 삭제
# -----------------------------
def delete_transaction(session: Session, transaction_id: int) -> None:
    """거래 삭제."""
    tx = get_transaction_by_id(session, transaction_id)
    session.delete(tx)
    session.commit()
    
    
# -----------------------------
# 주기 갱신(tmp: 30분)
# -----------------------------
def update_transaction_recurring(session: Session, transaction_id: int) -> Transaction:   
    """거래 주기 갱신: 지금 시각(KST) 기준 30분 뒤로 설정"""
    from datetime import datetime, timedelta
    
    tx = get_transaction_by_id(session, transaction_id)

    # KST(UTC+9) 기준 현재 시각으로부터 30분 뒤로 재설정
    korea_tz = timedelta(hours=9)
    now_kst = datetime.utcnow() + korea_tz
    tx.transaction_due = now_kst + timedelta(minutes=5)
    
    session.add(tx)
    session.commit()
    session.refresh(tx)
    return tx
