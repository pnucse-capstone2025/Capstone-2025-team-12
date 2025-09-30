import redis
# Redis 클라이언트 설정 (localhost, 기본 포트 6379)
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def get_redis():
    return redis_client

