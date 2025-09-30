from typing import List, Optional
from sqlmodel import Session, select
from fastapi import HTTPException, status
from passlib.context import CryptContext

from app.models.user_models import User

# ----------------------------
# 보안 설정
# ----------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MAX_FAILED_LOGIN = 5  # 허용 실패 횟수

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ----------------------------
# 기본 조회
# ----------------------------
def get_user_by_id(session: Session, user_id: int) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

def get_user_by_login_id(session: Session, login_id: str) -> Optional[User]:
    statement = select(User).where(User.user_login_id == login_id)
    return session.exec(statement).first()

def list_users(session: Session) -> List[User]:
    statement = select(User)
    return session.exec(statement).all()

# ----------------------------
# 회원가입(신규 API용)
# ----------------------------
def register_user(
    session: Session,
    user_name: str,
    user_login_id: str,
    password: str
) -> User:
    # 중복 체크
    if get_user_by_login_id(session, user_login_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="login_id already registered")

    hashed_pw = get_password_hash(password)
    user = User(
        user_name=user_name,
        user_login_id=user_login_id,
        user_login_pw=hashed_pw,
        user_failed_count=0,
        user_locked=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# ----------------------------
# 수정 / 삭제
# ----------------------------
def update_user(
    session: Session,
    user_id: int,
    user_name: Optional[str] = None,
    user_login_id: Optional[str] = None,
    password: Optional[str] = None,
    user_locked: Optional[bool] = None,
    user_failed_count: Optional[int] = None,
) -> User:
    user = get_user_by_id(session, user_id)

    if user_name is not None:
        user.user_name = user_name

    if user_login_id is not None:
        existing = get_user_by_login_id(session, user_login_id)
        if existing and existing.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="login_id already registered")
        user.user_login_id = user_login_id

    if password is not None:
        user.user_login_pw = get_password_hash(password)

    if user_locked is not None:
        user.user_locked = user_locked

    if user_failed_count is not None:
        user.user_failed_count = max(0, int(user_failed_count))

    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def delete_user(session: Session, user_id: int) -> None:
    user = get_user_by_id(session, user_id)
    session.delete(user)
    session.commit()

# ----------------------------
# 로그인
# ----------------------------
def signin(session: Session, login_id: str, pwd: str) -> Optional[User]:
    user = get_user_by_login_id(session, login_id)
    if not user:
        return None
    if user.user_locked:
        return None
    if not verify_password(pwd, user.user_login_pw):
        user.user_failed_count += 1
        if user.user_failed_count >= MAX_FAILED_LOGIN:
            user.user_locked = True
        session.add(user)
        session.commit()
        return None

    if user.user_failed_count != 0:
        user.user_failed_count = 0
        session.add(user)
        session.commit()
    return user

# ----------------------------
# 하위호환 래퍼(구 라우터용)
# ----------------------------
def get_user_by_userID(session: Session, userID: str) -> Optional[User]:
    """구 함수명 호환: userID == user_login_id"""
    return get_user_by_login_id(session, userID)

def create_user(
    session: Session,
    name: str,
    userID: str,
    password: str
) -> User:
    """구 함수명/파라미터 호환: 이메일이 없으므로 placeholder 사용"""
    if get_user_by_login_id(session, userID):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="userID already registered")

    # 이메일이 필수 컬럼이므로 고유 placeholder 생성 (충돌 방지)
    hashed_pw = get_password_hash(password)
    user = User(
        user_name=name,
        user_login_id=userID,
        user_login_pw=hashed_pw,
        user_failed_count=0,
        user_locked=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user