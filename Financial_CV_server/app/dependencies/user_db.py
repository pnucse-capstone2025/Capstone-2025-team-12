from sqlmodel import Session, create_engine, SQLModel
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

USER_DB_URL = os.getenv("USER_DB_URL", "sqlite:///./user.db")

# sqlite는 check_same_thread=False 필요
user_db_engine = create_engine(
    USER_DB_URL,
    connect_args={"check_same_thread": False} if USER_DB_URL.startswith("sqlite") else {},
    echo=False,
)

def get_user_session():
    with Session(user_db_engine) as session:
        yield session

def create_user_db():
    """모델 로드 → 테이블 생성 → (sqlite면) 간단 마이그레이션"""
    # 반드시 모델 import 후 create_all
    from app.models.user_models import User  # noqa: F401

    SQLModel.metadata.create_all(user_db_engine)

    if USER_DB_URL.startswith("sqlite"):
        _maybe_migrate_sqlite()

def _maybe_migrate_sqlite():
    """예전 스키마(name/userID/PW/createdAT)를 새 스키마로 보정"""
    with user_db_engine.connect() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        cols = {r[1] for r in rows}  # column names

        # 컬럼명 변경(있으면 변경, 실패해도 무시)
        def try_exec(sql: str):
            try:
                conn.exec_driver_sql(sql)
            except Exception:
                pass

        if "name" in cols and "user_name" not in cols:
            try_exec("ALTER TABLE users RENAME COLUMN name TO user_name;")
        if "userID" in cols and "user_login_id" not in cols:
            try_exec("ALTER TABLE users RENAME COLUMN userID TO user_login_id;")
        if "PW" in cols and "user_login_pw" not in cols:
            try_exec("ALTER TABLE users RENAME COLUMN PW TO user_login_pw;")
        if "createdAT" in cols and "created_at" not in cols:
            try_exec("ALTER TABLE users RENAME COLUMN createdAT TO created_at;")

        # 최신 컬럼 없으면 추가
        rows = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        cols = {r[1] for r in rows}

        if "user_mail" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN user_mail TEXT DEFAULT '' NOT NULL;"
            )
        if "user_failed_count" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN user_failed_count INTEGER DEFAULT 0 NOT NULL;"
            )
        if "user_locked" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN user_locked INTEGER DEFAULT 0 NOT NULL;"
            )

        conn.commit()
