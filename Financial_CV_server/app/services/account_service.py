from typing import List, Optional, Tuple
from sqlmodel import Session, select
from fastapi import HTTPException, status
from app.models.account_models import Account

# -----------------------------
# 조회
# -----------------------------
def list_accounts(session: Session) -> List[Account]:
    return session.exec(select(Account)).all()


def list_accounts_by_user(session: Session, account_user_id: int) -> List[Account]:
    stmt = select(Account).where(Account.account_user_id == account_user_id)
    return session.exec(stmt).all()


def get_account_by_id(session: Session, account_id: int) -> Account:
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


def get_account_by_number(session: Session, account_number: str) -> Account:
    stmt = select(Account).where(Account.account_number == account_number)
    account = session.exec(stmt).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with number '{account_number}' not found"
        )
    return account


# -----------------------------
# 생성/수정/삭제
# -----------------------------
def create_account(
    session: Session,
    account_user_id: int,
    account_number: str,
    account_bank: str,
    account_balance: int = 0,
) -> Account:
    """계좌 생성 (account_number 중복 불가)"""
    exists = session.exec(
        select(Account).where(Account.account_number == account_number)
    ).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account number '{account_number}' already in use"
        )

    account = Account(
        account_user_id=account_user_id,
        account_number=account_number,
        account_bank=account_bank,
        account_balance=account_balance,
    )
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


def update_account(
    session: Session,
    account_id: int,
    account_number: Optional[str] = None,
    account_balance: Optional[int] = None,
    account_bank: Optional[str] = None,
) -> Account:
    account = get_account_by_id(session, account_id)

    if account_number is not None:
        dup = session.exec(
            select(Account).where(
                Account.account_number == account_number,
                Account.account_id != account_id
            )
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account number '{account_number}' already in use"
            )
        account.account_number = account_number

    if account_balance is not None:
        account.account_balance = account_balance

    if account_bank is not None:
        account.account_bank = account_bank

    session.add(account)
    session.commit()
    session.refresh(account)
    return account


def delete_account(session: Session, account_id: int) -> None:
    account = get_account_by_id(session, account_id)
    session.delete(account)
    session.commit()


# -----------------------------
# 이체
# -----------------------------
def transfer_between_accounts(
    session: Session,
    from_account_number: str,
    withdraw_amount: int,
    to_account_number: str,
    deposit_amount: int
) -> Tuple[Account, Account]:
    if withdraw_amount <= 0 or deposit_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amounts must be positive integers"
        )
    if withdraw_amount != deposit_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdraw and deposit amounts must be equal"
        )

    from_acc = get_account_by_number(session, from_account_number)
    to_acc = get_account_by_number(session, to_account_number)

    if from_acc.account_id == to_acc.account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same account"
        )

    if withdraw_amount > from_acc.account_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance in '{from_account_number}' (current: {from_acc.account_balance})"
        )

    try:
        # 금액 이동
        from_acc.account_balance -= withdraw_amount
        to_acc.account_balance += deposit_amount

        # 송신 계좌 사용 횟수 1 증가
        from_acc.account_count = (from_acc.account_count or 0) + 1

        session.add(from_acc)
        session.add(to_acc)
        session.commit()
        session.refresh(from_acc)
        session.refresh(to_acc)
        return from_acc, to_acc
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transfer failed due to an internal error"
        )
