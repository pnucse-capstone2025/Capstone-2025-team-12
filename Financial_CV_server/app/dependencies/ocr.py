import cv2
import numpy as np
import requests
import uuid
import time
import json
import os
import easyocr
from PIL import Image
import math
from deskew import determine_skew



def call_clova_ocr(image_bytes: bytes, clova_secret: str, api_url: str,
                   image_format: str = 'png', image_name: str = 'image') -> dict:
    request_json = {
        'images': [{ 'format': image_format, 'name': image_name }],
        'requestId': str(uuid.uuid4()), 'version': 'V2',
        'timestamp': int(time.time() * 1000)
    }
    payload = {'message': json.dumps(request_json).encode('UTF-8')}
    headers = {'X-OCR-SECRET': clova_secret}
    files = [('file', (f'image.{image_format}', image_bytes, f'image/{image_format}'))]
    resp = requests.post(api_url, headers=headers, data=payload, files=files)
    resp.raise_for_status()
    return resp.json()


def run_clova_ocr(path: str, clova_secret: str, api_url: str) -> str:
    """
    원본 이미지를 그대로 OCR API에 보내고,
    inferText를 줄 단위로 반환합니다.
    """
    # 1) 파일을 바이너리로 읽기
    with open(path, 'rb') as f:
        image_bytes = f.read()

    # 2) OCR API 호출
    result = call_clova_ocr(image_bytes, clova_secret, api_url)

    # 3) 모든 필드의 inferText 를 줄별로 수집
    lines = []
    for img_block in result.get('images', []):
        for fld in img_block.get('fields', []):
            text = fld.get('inferText', '').strip()
            if text:
                lines.append(text)

    # 4) 줄바꿈으로 연결
    return "\n".join(lines)









def run_easyocr_ocr(path: str,
                    use_preprocess: bool = True,
                    languages: list = ['ko','en'],
                    gpu: bool = False,
                    detail: int = 0) -> str:
    """
    :param path: 이미지 파일 경로
    :param use_preprocess: True면 로컬 전처리 적용 후 OCR 수행
    :param languages: 사용할 언어 코드(문자열) 또는 언어 리스트 (예: 'ko' 또는 ['ko','en'])
    :param gpu: GPU 사용 여부
    :param detail: 0=텍스트만 반환, 1=박스+텍스트+신뢰도 반환
    :return: 텍스트 문자열(detail=0) 또는 (bbox, text, confidence) 리스트(detail=1)
    """
    if use_preprocess:
        result = preprocess_image(path)

        # bytes → imdecode, ndarray → 그대로
        if isinstance(result, (bytes, bytearray)):
            arr = np.frombuffer(result, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                raise IOError(f"전처리된 이미지를 디코딩할 수 없습니다: {path}")
        elif isinstance(result, np.ndarray):
            # preprocess_image이 RGB ndarray를 반환했다면…
            # EasyOCR에 넣으려면 RGB → BGR → RGB 컨버전을 건너뛰어야 할 수도 있습니다.
            # EasyOCR은 내부에서 RGB 순서로 처리하니, BGR → RGB 변환 필요할 수 있음
            img = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
        else:
            raise TypeError(f"preprocess_image 반환값 타입을 알 수 없습니다: {type(result)}")
    else:
        img = cv2.imread(path)
        if img is None:
            raise IOError(f"이미지를 로드할 수 없습니다: {path}")
    reader = easyocr.Reader(languages, gpu=gpu)
    raw_results = reader.readtext(img, detail=1)

    if detail == 1:
        return raw_results
    texts = []
    for res in raw_results:
        if isinstance(res, (tuple, list)) and len(res) >= 2:
            texts.append(res[1])
        elif isinstance(res, str):
            texts.append(res)
        else:
            texts.append(str(res))
    return ' '.join(texts).strip()

