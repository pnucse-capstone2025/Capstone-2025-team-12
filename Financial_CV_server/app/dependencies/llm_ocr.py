# app/dependencies/llm_ocr.py
import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter()

INSTRUCTIONS = """You are an expert in classification and key information extraction for financial documents.

You will be given OCR TEXT (not an image). DO NOT perform OCR; ONLY use the provided text verbatim.

STRICT RULES (read carefully):
- VERBATIM-ONLY: Every field value MUST be an exact, contiguous substring copied from the OCR TEXT (character-for-character). Do NOT correct typos, do NOT normalize numbers, do NOT infer or guess missing digits, and do NOT change spacing, hyphens, dots, or masking (e.g., ****-1234 must remain ****-1234).
- NO “REALISM” CORRECTIONS: Never change obviously wrong years like 8210 to 2018. If the OCR TEXT contains 8210, you MUST output 8210 as-is.
- DATES: Output the date ONLY if the OCR TEXT already contains a full unambiguous date in YYYY-MM-DD form. If not present in that exact form, leave the field blank. Do NOT reformat from other styles (e.g., 2024/01/10, 24-1-10, 2024.01.10) and do NOT infer missing parts.
- AMOUNTS: 거래금액 MUST be copied from the OCR TEXT first (verbatim), then digits-only normalization is allowed ONLY by removing non-digits from that exact copied substring. Do NOT change the order of digits. If multiple amounts exist, prefer a value explicitly labeled as a total (e.g., 합계/총액/결제금액). If uncertain, leave blank.
- MISSING OR UNCLEAR: If a required field does not clearly exist in the OCR TEXT as a contiguous substring, leave it blank. Do NOT fabricate values.
- SINGLE CATEGORY: Classify into exactly ONE category from the list below; if none applies, return exactly: 서류가 분류되지 않았습니다.
- If the entire document is unclear or not a financial document, return exactly: 서류를 인식할 수 없습니다.

1) Classify the document into exactly ONE of:
   - 정기구독 및 납부
   - 송장 및 세금 계산서
   - 이체 및 송금 전표
   - 은행 거래내역서
   - 카드명세서

2) Output MUST be only the following 8 key-value lines (exactly in this order and exactly these keys). For each value, follow VERBATIM-ONLY above (the only exception: 거래금액은 복사한 동일 부분문자열에서 숫자만 남기는 정규화만 허용).

   서류 종류 : <위의 categories 중 하나>
   제목 : <short title from OCR TEXT or blank>
   거래금액 : <digits only from a single contiguous amount string found in OCR TEXT, or blank>
   거래대상 : <issuer or recipient verbatim substring or blank>
   계좌 은행 : <verbatim substring or blank>
   계좌번호 : <verbatim substring or blank>
   거래대상 계좌번호 : <verbatim substring or blank>
   지불기일 : <YYYY-MM-DD exactly as appears in OCR TEXT, or blank>

REMINDERS:
- NEVER reformat dates; ONLY accept YYYY-MM-DD if that exact pattern exists in the OCR TEXT. Otherwise blank.
- NEVER change numeric strings to “more realistic” years or amounts.
- NEVER output explanations, tables, JSON, or extra text. Output ONLY the 8 lines above.
"""

INSTRUCTIONS_TEXT = INSTRUCTIONS
