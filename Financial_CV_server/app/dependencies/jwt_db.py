from jose import jwt
from datetime import datetime, timedelta, timezone
import time

SECRET_KEY = "cf2abc207680ba85bc9ce0e587183225"
ALG = "HS256"

class JWTUtil:
    # JWT Token 생성 함수
    def create_token(self, payload: dict,
                     expires_delta: timedelta | None = timedelta(minutes=30)) -> str:
        payload_to_encode = {}

        # datetime → ISO 문자열로 변환 (JWT 내에 필요한 필드만 추림)
        for key, value in payload.items():
            if isinstance(value, datetime):
                payload_to_encode[key] = value.isoformat()
            else:
                payload_to_encode[key] = value

        # JWT 표준에 따라 만료시간은 UNIX timestamp(int)
        expire = datetime.now(timezone.utc) + expires_delta
        payload_to_encode["exp"] = int(expire.timestamp())

        return jwt.encode(payload_to_encode, SECRET_KEY, algorithm=ALG)

    # JWT 토큰 디코딩 함수
    def decode_token(self, token: str) -> dict | None:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALG])
            if payload:
                now = int(time.time())
                exp = payload.get("exp", 0)
                if exp < now:
                    return None
                return payload
        except Exception:
            pass
        return None
