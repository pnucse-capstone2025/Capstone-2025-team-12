# app/routers/reminder_router.py
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.models.reminder_models import Reminder
# 프로젝트에 별도 세션 의존성이 없으면 아래 라인을 get_document_session 등으로 교체하세요.
from app.dependencies.reminder_db import get_reminder_session

from app.services.reminder_service import (
    ReminderCreate,
    ReminderUpdate,
    create_reminder,
    update_reminder,
    delete_reminder,
    get_all_reminders,
    get_reminder_by_id,
    get_reminders_by_transaction_id,
    get_reminders_by_status_and_user,
    get_reminders_by_user_id,
)

router = APIRouter(prefix="/reminders", tags=["reminders"])


# -----------------------------
# 전체 조회
# -----------------------------
@router.get("/", response_model=List[Reminder])
def api_get_all_reminders(
    session: Session = Depends(get_reminder_session),
) -> List[Reminder]:
    """모든 리마인더 조회 (만기일 오름차순)"""
    return get_all_reminders(session=session)


# -----------------------------
# 단일 조회 (id)
# -----------------------------
@router.get("/{reminder_id}", response_model=Reminder)
def api_get_reminder_by_id(
    reminder_id: int,
    session: Session = Depends(get_reminder_session),
) -> Reminder:
    """reminder_id로 단일 리마인더 조회"""
    return get_reminder_by_id(session=session, reminder_id=reminder_id)


# -----------------------------
# 트랜잭션 id로 조회
# -----------------------------
@router.get("/transaction/{transaction_id}", response_model=List[Reminder])
def api_get_reminders_by_transaction(
    transaction_id: int,
    session: Session = Depends(get_reminder_session),
) -> List[Reminder]:
    """특정 트랜잭션에 연결된 모든 리마인더 조회"""
    return get_reminders_by_transaction_id(session=session, transaction_id=transaction_id)


# -----------------------------
# 상태여부 + 유저 id로 조회
# -----------------------------
@router.get("/user/{reminder_user_id}/status", response_model=List[Reminder])
def api_get_reminders_by_status_and_user(
    reminder_user_id: int,
    is_done: bool = Query(..., description="완료 여부: true/false"),
    session: Session = Depends(get_reminder_session),
) -> List[Reminder]:
    """
    상태(완료/미완료)와 사용자 id로 리마인더 조회
    - is_done=true  : 완료된 리마인더
    - is_done=false : 미완료 리마인더
    """
    return get_reminders_by_status_and_user(
        session=session,
        reminder_user_id=reminder_user_id,
        is_done=is_done,
    )


# -----------------------------
# 유저 id로 조회
# -----------------------------
@router.get("/user/{reminder_user_id}", response_model=List[Reminder])
def api_get_reminders_by_user(
    reminder_user_id: int,
    session: Session = Depends(get_reminder_session),
) -> List[Reminder]:
    """사용자 id로 모든 리마인더 조회"""
    return get_reminders_by_user_id(session=session, reminder_user_id=reminder_user_id)


# -----------------------------
# 생성
# -----------------------------
@router.post("/", response_model=Reminder, status_code=status.HTTP_201_CREATED)
def api_create_reminder(
    payload: ReminderCreate,
    session: Session = Depends(get_reminder_session),
) -> Reminder:
    """리마인더 생성"""
    return create_reminder(session=session, rem_in=payload)


# -----------------------------
# 부분 수정
# -----------------------------
@router.patch("/{reminder_id}", response_model=Reminder)
def api_update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    session: Session = Depends(get_reminder_session),
) -> Reminder:
    """리마인더 부분 수정"""
    return update_reminder(session=session, reminder_id=reminder_id, rem_upd=payload)


# -----------------------------
# 삭제
# -----------------------------
@router.delete("/{reminder_id}", status_code=status.HTTP_200_OK)
def api_delete_reminder(
    reminder_id: int,
    session: Session = Depends(get_reminder_session),
) -> dict:
    """리마인더 삭제"""
    return delete_reminder(session=session, reminder_id=reminder_id)
