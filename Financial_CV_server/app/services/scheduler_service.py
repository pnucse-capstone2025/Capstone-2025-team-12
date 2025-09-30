# app/services/scheduler.py
import threading
import logging
from datetime import datetime, timedelta, time as dtime, timezone
from sqlmodel import Session, select

from app.dependencies.transaction_db import transaction_db_engine
from app.dependencies.reminder_db import reminder_db_engine
from app.models.transaction_models import Transaction
from app.services.reminder_service import upsert_reminder_for_exact_due

logger = logging.getLogger("reminder_scheduler")

STOP_EVENT = threading.Event()

# ✅ 30초마다 체크
CHECK_INTERVAL_SECONDS = 60

# ✅ 남은 시간 임계값: 240/180/150/120/90/61
THRESHOLDS_SECONDS = [240, 180, 150, 120, 90, 61]


def _to_datetime_due(tx_due):
    if isinstance(tx_due, datetime):
        due_dt = tx_due
    else:
        # Legacy date → compose at 09:00 KST
        kst = timezone(timedelta(hours=9))
        due_dt = datetime.combine(tx_due, dtime(hour=9, minute=0, second=0, tzinfo=kst))

    if due_dt.tzinfo is None:
        # Assume KST if naive (한국 시간 기준)
        kst = timezone(timedelta(hours=9))
        return due_dt.replace(tzinfo=kst)
    return due_dt.astimezone(timezone(timedelta(hours=9)))


def _should_fire(now_kst: datetime, fire_at: datetime) -> bool:
    """
    now가 fire_at 시각과 동일한 CHECK_INTERVAL_SECONDS 창(윈도우)에 들어오면 트리거.
    폴링 간격이 60초이므로, 임계 시각(fire_at) 이후 첫 폴링에서 정확히 한 번만 True.
    """
    delta = (now_kst - fire_at).total_seconds()
    return 0 <= delta < CHECK_INTERVAL_SECONDS


def scheduler_loop():
    while not STOP_EVENT.is_set():
        try:
            # 한국 시간 기준으로 현재 시간 가져오기
            kst = timezone(timedelta(hours=9))
            now_kst = datetime.now(kst)
            logger.info(f"[poll] reminder scheduler tick at {now_kst.isoformat()} (interval={CHECK_INTERVAL_SECONDS}s)")

            with Session(transaction_db_engine) as tx_sess, Session(reminder_db_engine) as rem_sess:
                # 미종료 거래 조회 (필요시 due가 가까운 것만으로 좁혀 최적화 가능)
                tx_list = tx_sess.exec(
                    select(Transaction).where(Transaction.transaction_close == False)
                ).all()
                logger.info(f"[poll] open transactions={len(tx_list)}")

                for tx in tx_list:
                    due_dt_kst = _to_datetime_due(tx.transaction_due)

                    for seconds in THRESHOLDS_SECONDS:
                        fire_at = due_dt_kst - timedelta(seconds=seconds)
                        if _should_fire(now_kst, fire_at):
                            # 제목을 초 단위로 표기 (원하면 60초→1분 문자열 치환 가능)
                            title = f"{seconds}초 전 만기: {tx.transaction_title}"
                            upsert_reminder_for_exact_due(
                                rem_sess,
                                transaction_id=tx.transaction_id,
                                reminder_user_id=tx.transaction_user_id,
                                title=title,
                                due_at=fire_at,
                            )
                            logger.info(
                                f"[create] reminder for tx_id={tx.transaction_id} at "
                                f"{fire_at.isoformat()} ({seconds}s prior)"
                            )
        except Exception:
            logger.exception("[error] scheduler_loop exception")
        finally:
            STOP_EVENT.wait(CHECK_INTERVAL_SECONDS)


def start_scheduler_thread() -> threading.Thread:
    STOP_EVENT.clear()
    th = threading.Thread(target=scheduler_loop, name="reminder-scheduler", daemon=True)
    th.start()
    return th


def stop_scheduler_thread():
    STOP_EVENT.set()
