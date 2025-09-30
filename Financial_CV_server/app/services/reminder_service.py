# app/services/reminder_service.py
from typing import List, Optional, Dict
import logging
# ⬇️ timedelta, timezone 추가
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
# ⬇️ Field 추가
from sqlmodel import Session, select, SQLModel, Field

from app.models.reminder_models import Reminder

# module logger
logger = logging.getLogger("reminder_service")


# ----------------------------
# 요청 스키마 (Create / Update)
# ----------------------------
class ReminderCreate(SQLModel):
    transaction_id: int
    reminder_user_id: int
    reminder_title: str
    # ⬇️ 기본값: 현재 시간(UTC) + 180초
    due_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(seconds=180)
    )
    status: Optional[bool] = False  # 기본값: False -> 완료되지 않은 리마인더


class ReminderUpdate(SQLModel):
    transaction_id: Optional[int] = None
    reminder_user_id: Optional[int] = None
    reminder_title: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[bool] = None


# ----------------------------
# 단일 조회
# ----------------------------
def get_reminder_by_id(session: Session, reminder_id: int) -> Reminder:
    """reminder_id로 단일 리마인더 조회 (없으면 404)"""
    reminder = session.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )
    return reminder


# ----------------------------
# 전체 조회 (요청 1)
# ----------------------------
def get_all_reminders(session: Session) -> List[Reminder]:
    """모든 리마인더 조회 (만기일 오름차순)"""
    stmt = select(Reminder).order_by(Reminder.due_at)
    return session.exec(stmt).all()


# ----------------------------
# 트랜잭션 id로 조회 (요청 3)
# ----------------------------
def get_reminders_by_transaction_id(session: Session, transaction_id: int) -> List[Reminder]:
    """특정 트랜잭션에 연결된 모든 리마인더 조회"""
    stmt = (
        select(Reminder)
        .where(Reminder.transaction_id == transaction_id)
        .order_by(Reminder.due_at)
    )
    return session.exec(stmt).all()


# ----------------------------
# 상태 + 유저 id로 조회 (요청 4)
# ----------------------------
def get_reminders_by_status_and_user(
    session: Session,
    reminder_user_id: int,
    is_done: bool,
) -> List[Reminder]:
    """
    상태(완료/미완료)와 사용자 id로 리마인더 조회
    - is_done=True  : 완료된 리마인더
    - is_done=False : 미완료 리마인더
    """
    stmt = (
        select(Reminder)
        .where(
            (Reminder.reminder_user_id == reminder_user_id)
            & (Reminder.status == is_done)
        )
        .order_by(Reminder.due_at)
    )
    return session.exec(stmt).all()


# ----------------------------
# 유저 id로 조회 (요청 5)
# ----------------------------
def get_reminders_by_user_id(session: Session, reminder_user_id: int) -> List[Reminder]:
    """사용자 id로 모든 리마인더 조회"""
    stmt = (
        select(Reminder)
        .where(Reminder.reminder_user_id == reminder_user_id)
        .order_by(Reminder.due_at)
    )
    return session.exec(stmt).all()


# =========================================================
# 아래는 필요 시 사용할 수 있는 CRUD 유틸 (선택)
# =========================================================
def create_reminder(session: Session, rem_in: ReminderCreate) -> Reminder:
    """리마인더 생성"""
    db_rem = Reminder(**rem_in.model_dump())
    session.add(db_rem)
    session.commit()
    session.refresh(db_rem)
    return db_rem


def update_reminder(session: Session, reminder_id: int, rem_upd: ReminderUpdate) -> Reminder:
    """리마인더 부분 수정"""
    db_rem = get_reminder_by_id(session, reminder_id)
    update_data = rem_upd.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_rem, key, value)
    session.add(db_rem)
    session.commit()
    session.refresh(db_rem)
    return db_rem


def delete_reminder(session: Session, reminder_id: int) -> Dict[str, str]:
    """리마인더 삭제"""
    db_rem = get_reminder_by_id(session, reminder_id)
    session.delete(db_rem)
    session.commit()
    return {"message": "Reminder deleted successfully"}


# =========================================================
# 테스트 용
# =========================================================
def upsert_reminder_for_exact_due(
    session: Session, *, transaction_id: int, reminder_user_id: int, title: str, due_at: datetime
) -> Reminder | None:
    logger.info(
        f"[poll] upsert attempt tx_id={transaction_id}, user_id={reminder_user_id}, due_at={due_at.isoformat()}, title={title}"
    )
    existing = session.exec(
        select(Reminder).where(
            (Reminder.transaction_id == transaction_id) & (Reminder.due_at == due_at)
        )
    ).first()
    if existing:
        logger.info(
            f"[poll] skip existing reminder id={existing.reminder_id} for tx_id={transaction_id} at {due_at.isoformat()}"
        )
        return None
    rem = Reminder(
        transaction_id=transaction_id,
        reminder_user_id=reminder_user_id,
        reminder_title=title,
        due_at=due_at,
        status=False,
    )
    session.add(rem)
    session.commit()
    session.refresh(rem)
    logger.info(
        f"[poll] created reminder id={rem.reminder_id} for tx_id={transaction_id} at {due_at.isoformat()}"
    )
    return rem
