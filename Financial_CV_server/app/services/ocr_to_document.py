# app/services/ocr_to_document.py
from __future__ import annotations
import re
from datetime import date, datetime
from typing import Dict, Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.services.document_service import create_document, DocumentCreate

# key: value 형식 한 줄 파싱
KV_LINE_RE = re.compile(r"^\s*([^:\n]+?)\s*:\s*(.+?)\s*$")

def _normalize_key(s: str) -> str:
    """
    키 정규화:
    - 양끝 공백 제거
    - 소문자
    - 공백/콜론/탭/중간 공백 제거 (한글 키 대응)
    """
    s = (s or "").strip().lower()
    s = re.sub(r"[\s:\t]", "", s)
    return s

# 한글 키 → 내부 표준 키 매핑
# (프롬프트 출력 형식)
KEY_ALIASES: Dict[str, str] = {
    _normalize_key("서류 종류"): "document_classification_label",
    _normalize_key("제목"): "document_title",
    _normalize_key("거래금액"): "document_balance",
    _normalize_key("거래대상"): "document_partner",
    _normalize_key("계좌 은행"): "document_bank",
    _normalize_key("계좌은행"): "document_bank",  # 공백 없는 변형도 허용
    _normalize_key("계좌번호"): "document_account_number",
    _normalize_key("거래대상 계좌번호"): "document_partner_number",
    _normalize_key("지불기일"): "document_due",

}

def _parse_kv_strict(ocr_text: str) -> Dict[str, str]:
    """
    OCR 결과가 아래와 같은 형태라고 가정하고 그대로 파싱합니다.
      서류 종류 : <카테고리 한글 라벨>
      제목 : ...
      거래금액 : ...
      거래대상 : ...
      계좌 은행 : ...
      계좌번호 : ...
      거래대상 계좌번호 : ...
      지불기일 : YYYY-MM-DD
    - 한글 키를 내부 표준 키로 매핑 (KEY_ALIASES 사용)
    - 과거 영문 키도 허용(백워드 호환)
    """
    out: Dict[str, str] = {}
    for line in ocr_text.splitlines():
        m = KV_LINE_RE.match(line)
        if not m:
            continue
        raw_key = m.group(1)
        val = m.group(2).strip()
        norm_key = _normalize_key(raw_key)
        std_key = KEY_ALIASES.get(norm_key)
        if not std_key:
            continue
        out[std_key] = val
    return out

def _to_int_amount(s: str) -> int:
    # 숫자만 추출 (콤마/기호 제거)
    digits = re.sub(r"[^\d]", "", s or "")
    return int(digits) if digits else 0

def _to_date(s: str) -> Optional[date]:
    if not s:
        return None
    ss = re.sub(r"[./]", "-", s.strip())
    # YYYY-MM-DD
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", ss)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    # 보조 포맷
    for fmt in ("%Y%m%d", "%y-%m-%d"):
        try:
            return datetime.strptime(ss, fmt).date()
        except ValueError:
            continue
    return None

def _normalize_label(s: str) -> str:
    """카테고리 라벨 정규화(공백/구두점 제거, 소문자)."""
    s = (s or "").strip().lower()
    s = re.sub(r"[\s\t\-_/]+", "", s)
    return s

def _classify_id_from_label(label: str) -> int:
    """
    프롬프트에서 반환되는 '서류 종류' 한글 라벨을 숫자 ID로 매핑.
    - 정기구독 및 납부         -> 0
    - 송장 및 세금 계산서      -> 1
    - 이체 및 송금 전표(오탈자 '이체 밀'도 허용) -> 2
    - 은행 거래내역서          -> 3
    - 카드명세서               -> 4
    여러 변형/동의어도 최대한 수용.
    """
    n = _normalize_label(label)

    # 기본 라벨
    label_map = {
        _normalize_label("정기구독 및 납부"): 0,
        _normalize_label("송장 및 세금 계산서"): 1,
        _normalize_label("이체 및 송금 전표"): 2,
        _normalize_label("은행 거래내역서"): 3,
        _normalize_label("카드명세서"): 4,
    }

    # 흔한 표기 변형/오탈자/동의어
    label_map[_normalize_label("세금계산서")] = 1
    label_map[_normalize_label("송장")] = 1
    label_map[_normalize_label("청구서")] = 1

    label_map[_normalize_label("이체 및 송금 전표")] = 2  # 오탈자 '밀' 허용
    label_map[_normalize_label("송금전표")] = 2

    label_map[_normalize_label("은행거래내역서")] = 3

    label_map[_normalize_label("신용카드명세서")] = 4
    label_map[_normalize_label("카드 명세서")] = 4

    return label_map.get(n, 0)  # 매칭 실패 시 0으로 디폴트(정책에 맞게 조정 가능)

def create_document_from_ocr(session: Session, user_id: int, ocr_text: str):
    """
    - OCR 원문(ocr_text)을 document_content에 그대로 저장
    - 한글 키 기반으로 필드 파싱
    - '서류 종류' 라벨을 0~4의 classification_id로 매핑
    - 날짜(document_due)는 필수로 검증
    - document_user_id는 요청대로 '0'으로 고정(후에 사용자 함수로 교체 예정)
    """
    if not ocr_text or not ocr_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OCR text가 비어 있습니다."
        )

    d = _parse_kv_strict(ocr_text)

    # 핵심 필드 추출
    title = (d.get("document_title") or "").strip() or "제목없음"
    amount = _to_int_amount(d.get("document_balance", ""))
    partner = d.get("document_partner", "") or ""
    bank = d.get("document_bank", "") or ""
    account = d.get("document_account_number", "") or ""
    partner_number = d.get("document_partner_number", "") or ""

    # 날짜 필수
    due = _to_date(d.get("document_due", ""))
    if not due:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "document_due 날짜 파싱 실패 또는 누락", "raw": d.get("document_due", None)}
        )

    # 분류 라벨 → 숫자 ID
    classification_label = d.get("document_classification_label", "")
    classification_id = _classify_id_from_label(classification_label)

    # 요청사항: document_user_id는 지금은 0으로 저장
    payload = DocumentCreate(
        document_user_id=user_id,  # TODO: 나중에 실제 사용자 ID 획득 로직으로 교체
        document_title=title,
        document_balance=amount,
        document_partner=partner,
        document_bank=bank,
        document_account_number=account,
        document_partner_number=partner_number,
        document_due=due,
        document_classification_id=classification_id,
        document_content=ocr_text,   # OCR 원문 전체 저장
        document_partner_id=0,       # 필요 시 후처리
    )

    return create_document(session, payload)
