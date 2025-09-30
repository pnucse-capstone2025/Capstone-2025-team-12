from typing import List, Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, conint
from sqlmodel import Session

from app.models.account_models import Account
from app.dependencies.account_db import get_account_session
from app.services.account_service import (
    create_account,
    get_account_by_id,
    list_accounts_by_user,
    get_account_by_number,
    transfer_between_accounts,
    update_account,
    delete_account,
    list_accounts,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])

# ----------------------------
# Pydantic 모델
# ----------------------------
class AccountCreateModel(BaseModel):
    account_user_id: int
    account_number: str
    account_bank: str                # ✅ 은행 필드 추가
    account_balance: Optional[int] = 0

class AccountUpdateModel(BaseModel):
    account_number: Optional[str] = None
    account_balance: Optional[int] = None
    account_bank: Optional[str] = None

class TransferModel(BaseModel):
    from_account_number: str
    withdraw_amount: conint(ge=1)
    to_account_number: str
    deposit_amount: conint(ge=1)

# ----------------------------
# 라우트
# ----------------------------
@router.get("/", response_model=List[Account], status_code=status.HTTP_200_OK)
def api_list_accounts(session: Session = Depends(get_account_session)) -> List[Account]:
    return list_accounts(session)

@router.post("/", response_model=Account, status_code=status.HTTP_201_CREATED)
def api_create_account(
    account_in: AccountCreateModel,
    session: Session = Depends(get_account_session)
) -> Account:
    return create_account(
        session,
        account_user_id=account_in.account_user_id,
        account_number=account_in.account_number,
        account_bank=account_in.account_bank,                 # ✅ 전달
        account_balance=account_in.account_balance,
    )

@router.get("/user/{account_user_id}", response_model=List[Account])
def api_list_accounts_by_user(
    account_user_id: int,
    session: Session = Depends(get_account_session)
) -> List[Account]:
    return list_accounts_by_user(session, account_user_id)

@router.get("/number/{account_number}", response_model=Account)
def api_get_account_by_number(
    account_number: str,
    session: Session = Depends(get_account_session)
) -> Account:
    return get_account_by_number(session, account_number)

@router.get("/{account_id}", response_model=Account)
def api_get_account(
    account_id: int,
    session: Session = Depends(get_account_session)
) -> Account:
    return get_account_by_id(session, account_id)

@router.put("/{account_id}", response_model=Account)
def api_update_account(
    account_id: int,
    account_in: AccountUpdateModel,
    session: Session = Depends(get_account_session)
) -> Account:
    return update_account(
        session,
        account_id,
        account_number=account_in.account_number,
        account_balance=account_in.account_balance,
        account_bank=account_in.account_bank,
    )

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_account(
    account_id: int,
    session: Session = Depends(get_account_session)
) -> None:
    delete_account(session, account_id)

@router.post("/transfer", response_model=List[Account], status_code=status.HTTP_200_OK)
def api_transfer_accounts(
    transfer_in: TransferModel,
    session: Session = Depends(get_account_session)
) -> List[Account]:
    from_acc, to_acc = transfer_between_accounts(
        session,
        transfer_in.from_account_number,
        transfer_in.withdraw_amount,
        transfer_in.to_account_number,
        transfer_in.deposit_amount,
    )
    return [from_acc, to_acc]
