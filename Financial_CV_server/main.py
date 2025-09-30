from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import json
from datetime import datetime, date
import logging
import os
import tempfile
from logging.handlers import RotatingFileHandler
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import torch

import logging

from app.dependencies.file_db import create_file_db
from app.dependencies.user_db import create_user_db
from app.dependencies.document_db import create_document_db
from app.dependencies.account_db import create_account_db
from app.dependencies.transaction_db import create_transaction_db
from app.dependencies.reminder_db import create_reminder_db

from app.routers import file_router, user_router, document_router, account_router, llm_ocr_router, transaction_router, reminder_router
# from app.dependencies import tts as tts_router

from app.services.scheduler_service import start_scheduler_thread, stop_scheduler_thread


class CustomJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        encoded = jsonable_encoder(
            content,
            custom_encoder={
                datetime: lambda v: v.strftime("%Y-%m-%d/%H:%M:%S"),
                date: lambda v: v.strftime("%Y-%m-%d"),
            },
        )
        return json.dumps(encoded, ensure_ascii=False, allow_nan=False).encode("utf-8")


# Reduce noisy per-request access logs (e.g., /health checks every second)
logging.getLogger("uvicorn.access").disabled = False

# 리액트(Vite) 개발 서버 주소
origins = ["http://localhost:5173"]

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_user_db()
    create_file_db()
    create_document_db()
    create_account_db()
    create_transaction_db()
    create_reminder_db()

    # from app.dependencies.MeloTTS.melo.api import TTS  
    # device =  "cpu"
    # tts_model = TTS(language="KR", device=device)
    # app.state.tts_model = tts_model
    # app.state.speakers = tts_model.hps.data.spk2id
    # print(f"[TTS] 모델 로드 완료 (device={device}, speakers={list(app.state.speakers.keys())})")
    
    thread = start_scheduler_thread()
    try:
        yield
    finally:
        stop_scheduler_thread()

app = FastAPI(
    title="Financial CV Server",
    version="0.1.0",
    lifespan=lifespan,
    default_response_class=CustomJSONResponse,
)

# 로그 파일을 프로젝트 외부(temp)에 기록하여 watchfiles 변경 감지 루프 방지
log_dir = os.path.join(tempfile.gettempdir(), "financial_cv_logs")
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, "app.log")

stream_handler = logging.StreamHandler()
file_handler = RotatingFileHandler(log_path, maxBytes=5 * 1024 * 1024, backupCount=2, encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    handlers=[stream_handler, file_handler],
)

# watchfiles 잡음 억제 (자동 리로드 감시 로그)
logging.getLogger("watchfiles").setLevel(logging.WARNING)
logging.getLogger("watchfiles.main").setLevel(logging.WARNING)

# 라우터
app.include_router(user_router.router)
app.include_router(file_router.router)
app.include_router(document_router.router)
app.include_router(account_router.router)
app.include_router(transaction_router.router)
app.include_router(reminder_router.router)


app.include_router(llm_ocr_router.router)
# app.include_router(tts_router.router) 



# CORS
app.add_middleware(
    CORSMiddleware, 
    allow_origins=origins ,  # 허용할 프론트 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 임시/헬스체크
@app.get("/api/hello")
def hello():
    return {"message": "서버 연동 완료"}

@app.get("/health")
def health():
    return {"status": "ok"}
