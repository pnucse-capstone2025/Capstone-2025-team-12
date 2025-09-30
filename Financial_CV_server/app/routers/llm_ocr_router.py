# app/routers/ocr_ingest_router.py
from __future__ import annotations
import os
import base64
import json
import uuid
import time
import re
import requests

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.dependencies.document_db import get_document_session
from app.services.ocr_to_document import create_document_from_ocr
from app.dependencies.llm_ocr import INSTRUCTIONS, INSTRUCTIONS_TEXT  # ← 추가
from openai import OpenAI

router = APIRouter(tags=["ocr"])

# ---------- Preview ----------
class OcrPreviewRequest(BaseModel):
    image: str  # data URL (e.g., data:image/png;base64,xxxx)
    model: str | None = "gpt-4o-mini"
    provider: str = Field("clova", pattern="^(clova|openai)$")  # 기본 clova

class OcrPreviewResponse(BaseModel):
    ocr_text: str  # 최종 8개 key-value 결과(프런트는 기존과 동일하게 사용)

# ---------- Create ----------
class OcrIngestRequest(BaseModel):
    user_id: int
    ocr_text: str

class OcrIngestResponse(BaseModel):
    document_id: int
    document_title: str
    document_classification_id: int
    ocr_text: str

# ---------- OpenAI Helper ----------
def _ensure_openai_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY 미설정")
    return OpenAI(api_key=key)

def _call_openai_with_image(client: OpenAI, image_data_url: str, model: str | None) -> str:
    try:
        resp = client.responses.create(
            model=model or "gpt-4o-mini",
            input=[
                {"role": "system", "content": INSTRUCTIONS},
                {"role": "user", "content": [
                    {"type": "input_image", "image_url": image_data_url}
                ]},
            ],
            temperature=0.0,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR 처리 실패: {e}")

    text = ""
    try:
        if getattr(resp, "output", None):
            for c in resp.output[0].content:
                t = None
                if isinstance(c, dict):
                    if c.get("type") == "output_text":
                        t = c.get("text")
                else:
                    if getattr(c, "type", None) == "output_text":
                        t = getattr(c, "text", None)
                if t:
                    text += t
        if not text and getattr(resp, "choices", None):
            msg = resp.choices[0].message
            text = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "") or ""
    except Exception:
        text = getattr(resp, "output_text", "") or ""

    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="빈 OCR 결과")
    return text

def _call_openai_with_text(client: OpenAI, ocr_text: str, model: str | None) -> str:
    """
    CLOVA 결과 텍스트를 GPT에 넣어 분류+핵심정보 8개 key로만 반환.
    """
    try:
        resp = client.responses.create(
            model=model or "gpt-4o-mini",
            input=[
                {"role": "system", "content": INSTRUCTIONS_TEXT},
                {"role": "user", "content": f"OCR TEXT:\n{ocr_text}"},
            ],
            temperature=0.0,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분류/추출 실패: {e}")

    text = ""
    try:
        if getattr(resp, "output", None):
            for c in resp.output[0].content:
                t = None
                if isinstance(c, dict):
                    if c.get("type") == "output_text":
                        t = c.get("text")
                else:
                    if getattr(c, "type", None) == "output_text":
                        t = getattr(c, "text", None)
                if t:
                    text += t
        if not text and getattr(resp, "choices", None):
            msg = resp.choices[0].message
            text = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "") or ""
    except Exception:
        text = getattr(resp, "output_text", "") or ""

    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="빈 분류/추출 결과")
    return text

# ---------- CLOVA Helper ----------
def _ensure_clova_conf():
    url = os.getenv("CLOVA_OCR_URL")
    secret = os.getenv("CLOVA_OCR_SECRET")
    if not url or not secret:
        raise HTTPException(status_code=500, detail="CLOVA_OCR_URL/CLOVA_OCR_SECRET 미설정")
    return url, secret

_DATAURL_RE = re.compile(r"^data:image/(\w+);base64,(.+)$", re.DOTALL)

def _extract_base64_from_data_url(data_url: str) -> tuple[str, bytes]:
    m = _DATAURL_RE.match(data_url or "")
    if not m:
        raise HTTPException(status_code=400, detail="image 필드는 data URL(base64) 형식이어야 합니다.")
    ext = m.group(1).lower()
    b64 = m.group(2)
    try:
        raw = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="이미지 base64 디코딩 실패")
    return ext, raw

def _call_clova_ocr(image_data_url: str) -> str:
    """
    CLOVA OCR 호출 → 텍스트 병합 반환
    - General OCR 응답(images[].fields[].inferText) 기준
    """
    url, secret = _ensure_clova_conf()
    ext, raw = _extract_base64_from_data_url(image_data_url)
    image_b64 = base64.b64encode(raw).decode("utf-8")

    payload = {
        "version": "V2",
        "requestId": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000),
        "images": [{
            "format": ext,          # "jpg","png" 등
            "name": "preview",
            "data": image_b64
        }]
    }
    headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "X-OCR-SECRET": secret
    }

    try:
        r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=20)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CLOVA OCR 호출 실패: {e}")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"CLOVA OCR 오류: HTTP {r.status_code} {r.text}")

    try:
        resp = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="CLOVA OCR 응답 JSON 파싱 실패")

    # images[0].fields[*].inferText 합치기
    try:
        images = resp.get("images") or []
        if not images:
            raise ValueError("images 비어 있음")
        fields = images[0].get("fields") or []
        texts = [f.get("inferText", "") for f in fields if isinstance(f, dict)]
        text = "\n".join(t for t in texts if t)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CLOVA OCR 응답 파싱 실패: {e}")

    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="CLOVA OCR 빈 결과")
    return text

# ---------- Routes ----------
@router.post("/ocr/ingest-preview", response_model=OcrPreviewResponse)
def ocr_preview(payload: OcrPreviewRequest):
    """
    provider:
      - 'clova'  : 이미지 → CLOVA OCR → 텍스트 → GPT(분류/추출) → 8개 key-value
      - 'openai' : 이미지 → GPT(이미지OCR+분류/추출) → 8개 key-value (기존 방식)
    """
    client = _ensure_openai_client()

    # 기본: CLOVA 경로
    raw_text = _call_clova_ocr(payload.image)                  # 1) 이미지 → CLOVA OCR
    kv_text  = _call_openai_with_text(client, raw_text, payload.model)  # 2) 텍스트 → GPT 분류/추출
    return OcrPreviewResponse(ocr_text=kv_text)

@router.post("/ocr/ingest-create", response_model=OcrIngestResponse)
def ocr_ingest_create(
    payload: OcrIngestRequest,
    session: Session = Depends(get_document_session),
):
    """
    생성 단계: 프런트에서 받은 8개 key-value 텍스트(ocr_text)만 사용하여 문서 생성.
    """
    ocr_text = (payload.ocr_text or "").strip()
    if not ocr_text:
        raise HTTPException(status_code=400, detail="ocr_text가 비어 있습니다.")

    try:
        doc = create_document_from_ocr(
            session=session,
            user_id=payload.user_id,  # 내부 정책상 0으로 저장해도, 서비스 함수에서 처리되게 유지
            ocr_text=ocr_text,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문서 생성 실패: {e}")

    return OcrIngestResponse(
        document_id=doc.document_id,
        document_title=doc.document_title,
        document_classification_id=doc.document_classification_id,
        ocr_text=ocr_text,
    )
