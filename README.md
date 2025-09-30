# 첫 눈 : 인공지능 기술을 활용한 디지털 약자 금융 활동 지원 서비스

### 1. 프로젝트 배경

#### 1.1. 국내외 시장 현황 및 문제점

- 디지털 전환이 가속화되면서 고령층·장애인·저소득층 등 디지털 약자는 금융 접근성에서 구조적 불이익을 겪고 있음.

- 국내 디지털 정보화 수준은 일반 국민 대비 77.5%에 불과하며, 특히 고령층은 71.4%로 가장 낮음.

- 시각장애인의 경우 금융 문서 확인, 일정 관리에서 높은 장벽을 체감하고 있으며, 점자 서류·스크린리더·음성 안내 기능에도 불구하고 여전히 대면 중심에 머무름.

#### 1.2. 필요성과 기대효과

- 사용자 정의

<img src ="./pictures/사용자정의.png">

- 필요성

  1. 단순한 접근 보조가 아니라 **금융 문서 이해·판단·자기결정 지원**이 필요.

  2. 복잡한 금융 서류를 보관하는 것에 피로도가 높음

  3. 기존 서비스들의 "대면 위주" , "보호자 동반 위주" 방식의 한계점이 있음.

- 기대효과

  1. 디지털약자의 **금융 자립성** 강화

  2. 금융 문서 관리 효율화

  3. 금융 문맹 문제 완화

  4. 디지털 금융 서비스 접근성 확대

  5. 사회/산업적 파급 효과

---

### 2. 개발 목표

#### 2.1. 목표 및 세부 내용

- 디지털 약자가 금융 문서를 쉽게 이해하고 자율적으로 거래를 관리할 수 있는 **AI 기반 플랫폼 개발**

- 주요 기능: 문서 자동 등록·분류, 거래 알림, 1:1 송금, 계좌/문서 관리, 음성 기반 인터페이스

#### 2.2. 기존 서비스 대비 차별성

- 기존 은행 서비스
  : 음성 OTP, 점자 문서, 스크린리더 호환 등 주로 **대면 위주 혹은 지원 기능**에 국한됨

- 첫눈 서비스: **문서 관리 + 일정 알림 + 송금 + 계좌 관리**까지 아우르는 종합 플랫폼 제공

> 간편한 로직과 터치 없이도 양방향 소통이 된다는 점, 카테고리 별 복잡한 금융 서류 분류까지 가능한 앱이라는 점이 핵심 차별점!

#### 2.3. 사회적 가치 도입 계획

- 금융 소외계층 자립성 강화 → **디지털 격차 해소**
- 금융 문맹 완화 → **사회적 포용성 확대**
- 비대면 금융 확대 → **운영 효율성 및 지속가능성 제고**

---

### 3. 시스템 설계

#### 3.1. 시스템 구성도

<img src="./pictures/시스템로직설계.png">

- **사용자(디지털 약자)**: 웹/앱 플랫폼을 통한 접근

- **프론트엔드**: React+Typescript 기반 직관적 UI/UX, 음성 명령 지원

- **백엔드**: FastAPI 서버, RDB + Redis 세션/인증 관리

- **AI**: OCR(Clova/EasyOCR) → LLM 분석·분류 → STT/TTS 음성 안내

#### 3.2. 사용 기술

- **Frontend**: React, TypeScript, Web Speech API

- **Backend**: FastAPI, Redis

- **AI**: NAVER Clova OCR (메인), EasyOCR (대체), GPT API (보조 분류)

- **TTS/STT**: Web Speech API, Melotts-Korean

---

### 4. 개발 결과

#### 4.1. 전체 시스템 흐름도

1. 회원가입 / 로그인

2. 마이페이지 > 계좌 등록

3. 마이페이지 > 대표 계좌 설정

4. 문서 촬영(OpenCV 인식)

5. OCR 처리 → 텍스트 추출

6. LLM 분석 → 분류 및 요약

7. 카테고리에 맞게 서류 보관함에 분류하여 저장

8. 일정 관리 → 알림 및 송금 연결

9. 사용자 인터페이스 → 음성 안내/명령 기반 실행

#### 4.2. 기능 설명 및 주요 기능 명세서

- **문서 등록/분류**: OCR 기반 자동 분류 (세금계산서, 카드명세서 등)

- **계좌 관리**: 계좌 등록/삭제, 대표 계좌 설정

- **송금 기능**: 송금 시 음성 안내 및 확인 절차

- **거래내역 관리**: 직접 송금/문서 기반 거래를 색상·레이블로 구분 표시

- **알림 기능**: 납부일·만기일 임박 시 자동 알림

#### 4.3. 디렉토리 구조

```bash
Capstone-2025-team-12
 ┣ docs
 ┃ ┣ 01.보고서
 ┃ ┃ ┣ 01.착수보고서.pdf
 ┃ ┃ ┣ 02.중간보고서.pdf
 ┃ ┃ ┗ 03.최종보고서.pdf
 ┃ ┣ 02.포스터
 ┃ ┃ ┗ 포스터파일.pdf
 ┃ ┗ 03.발표자료
 ┃ ┃ ┣ 발표자료.pdf
 ┃ ┃ ┗ 발표자료.pptx
 ┣ Financial_CV
 ┃ ┣ public
 ┃ ┃ ┣ fonts
 ┃ ┃ ┃ ┗ GowunDodum-Regular.ttf
 ┃ ┃ ┣ opencv.js
 ┃ ┃ ┗ vite.svg
 ┃ ┣ src
 ┃ ┃ ┣ api
 ┃ ┃ ┃ ┣ base.ts
 ┃ ┃ ┃ ┗ index.ts
 ┃ ┃ ┣ assets
 ┃ ┃ ┃ ┣ char_closed.png
 ┃ ┃ ┃ ┣ char_open.png
 ┃ ┃ ┃ ┣ eyes_closed.png
 ┃ ┃ ┃ ┣ eyes_open.png
 ┃ ┃ ┃ ┣ eyes_open_nobg.png
 ┃ ┃ ┃ ┣ eye_small.png
 ┃ ┃ ┃ ┣ firstsnow.png
 ┃ ┃ ┃ ┗ react.svg
 ┃ ┃ ┣ components
 ┃ ┃ ┃ ┣ AlertCard.css
 ┃ ┃ ┃ ┣ AlertCard.tsx
 ┃ ┃ ┃ ┣ DocumentCard.tsx
 ┃ ┃ ┃ ┣ DocumentForm.tsx
 ┃ ┃ ┃ ┣ NavigationBar.css
 ┃ ┃ ┃ ┣ NavigationBar.tsx
 ┃ ┃ ┃ ┣ PageWrapper.tsx
 ┃ ┃ ┃ ┣ SearchBar.css
 ┃ ┃ ┃ ┗ SearchBar.tsx
 ┃ ┃ ┣ data
 ┃ ┃ ┃ ┗ categories.ts
 ┃ ┃ ┣ hooks
 ┃ ┃ ┃ ┗ usePageVoiceScope.tsx
 ┃ ┃ ┣ pages
 ┃ ┃ ┃ ┣ AddAccountPage.tsx
 ┃ ┃ ┃ ┣ Camera.tsx
 ┃ ┃ ┃ ┣ DirectTransferPage.tsx
 ┃ ┃ ┃ ┣ DocumentCategoryPage.tsx
 ┃ ┃ ┃ ┣ DocumentDetail.tsx
 ┃ ┃ ┃ ┣ DocumentList.tsx
 ┃ ┃ ┃ ┣ DocumentScan.tsx
 ┃ ┃ ┃ ┣ EditProfilePage.tsx
 ┃ ┃ ┃ ┣ Home.tsx
 ┃ ┃ ┃ ┣ LoginPage.css
 ┃ ┃ ┃ ┣ LoginPage.tsx
 ┃ ┃ ┃ ┣ ManualRegister.tsx
 ┃ ┃ ┃ ┣ MyPage.css
 ┃ ┃ ┃ ┣ MyPage.tsx
 ┃ ┃ ┃ ┣ SignUpPage.tsx
 ┃ ┃ ┃ ┣ splash.css
 ┃ ┃ ┃ ┣ Splash.tsx
 ┃ ┃ ┃ ┣ TransactionHistoryPage.tsx
 ┃ ┃ ┃ ┗ TransferPage.tsx
 ┃ ┃ ┣ store
 ┃ ┃ ┃ ┣ useAccountStore.ts
 ┃ ┃ ┃ ┣ useDocumentStore.ts
 ┃ ┃ ┃ ┣ useTransactionStore.ts
 ┃ ┃ ┃ ┗ useVoicePref.ts
 ┃ ┃ ┣ utils
 ┃ ┃ ┃ ┗ voiceGate.tsx
 ┃ ┃ ┣ App.css
 ┃ ┃ ┣ App.tsx
 ┃ ┃ ┣ index.css
 ┃ ┃ ┣ main.tsx
 ┃ ┃ ┗ vite-env.d.ts
 ┃ ┣ API_DOCS.md
 ┃ ┣ API_DOCS_final.md
 ┃ ┣ eslint.config.js
 ┃ ┣ index.html
 ┃ ┣ package-lock.json
 ┃ ┣ package.json
 ┃ ┣ tsconfig.app.json
 ┃ ┣ tsconfig.json
 ┃ ┣ tsconfig.node.json
 ┃ ┗ vite.config.ts
 ┣ Financial_CV_server
 ┃ ┣ app
 ┃ ┃ ┣ dependencies
 ┃ ┃ ┃ ┣ MeloTTS
 ┃ ┃ ┃ ┃ ┣ .github
 ┃ ┃ ┃ ┃ ┃ ┗ workflows
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ pypi.yml
 ┃ ┃ ┃ ┃ ┣ docs
 ┃ ┃ ┃ ┃ ┃ ┣ install.md
 ┃ ┃ ┃ ┃ ┃ ┣ quick_use.md
 ┃ ┃ ┃ ┃ ┃ ┗ training.md
 ┃ ┃ ┃ ┃ ┣ melo
 ┃ ┃ ┃ ┃ ┃ ┣ configs
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ config.json
 ┃ ┃ ┃ ┃ ┃ ┣ monotonic_align
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ core.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┃ ┃ ┃ ┣ text
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ english_utils
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ abbreviations.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ number_norm.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ time_norm.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ es_phonemizer
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ base.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ cleaner.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ es_symbols.json
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ es_symbols.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ es_symbols_v2.json
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ es_to_ipa.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ example_ipa.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ gruut_wrapper.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ punctuation.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ spanish_symbols.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ test.ipynb
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ fr_phonemizer
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ base.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ cleaner.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ en_symbols.json
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ example_ipa.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ french_abbreviations.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ french_symbols.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ fr_symbols.json
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ fr_to_ipa.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ gruut_wrapper.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┣ punctuation.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ chinese.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ chinese_bert.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ chinese_mix.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ cleaner.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ cleaner_multiling.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ cmudict.rep
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ cmudict_cache.pickle
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ english.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ english_bert.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ french.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ french_bert.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ japanese.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ japanese_bert.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ korean.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ ko_dictionary.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ opencpop-strict.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ spanish.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ spanish_bert.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ symbols.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ tone_sandhi.py
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┃ ┃ ┃ ┣ api.py
 ┃ ┃ ┃ ┃ ┃ ┣ app.py
 ┃ ┃ ┃ ┃ ┃ ┣ attentions.py
 ┃ ┃ ┃ ┃ ┃ ┣ commons.py
 ┃ ┃ ┃ ┃ ┃ ┣ data_utils.py
 ┃ ┃ ┃ ┃ ┃ ┣ download_utils.py
 ┃ ┃ ┃ ┃ ┃ ┣ infer.py
 ┃ ┃ ┃ ┃ ┃ ┣ init_downloads.py
 ┃ ┃ ┃ ┃ ┃ ┣ losses.py
 ┃ ┃ ┃ ┃ ┃ ┣ main.py
 ┃ ┃ ┃ ┃ ┃ ┣ mel_processing.py
 ┃ ┃ ┃ ┃ ┃ ┣ models.py
 ┃ ┃ ┃ ┃ ┃ ┣ modules.py
 ┃ ┃ ┃ ┃ ┃ ┣ preprocess_text.py
 ┃ ┃ ┃ ┃ ┃ ┣ split_utils.py
 ┃ ┃ ┃ ┃ ┃ ┣ train.py
 ┃ ┃ ┃ ┃ ┃ ┣ train.sh
 ┃ ┃ ┃ ┃ ┃ ┣ transforms.py
 ┃ ┃ ┃ ┃ ┃ ┣ utils.py
 ┃ ┃ ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┃ ┃ ┣ test
 ┃ ┃ ┃ ┃ ┃ ┣ basetts_test_resources
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ en_egs_text.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ es_egs_text.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ fr_egs_text.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ jp_egs_text.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┣ kr_egs_text.txt
 ┃ ┃ ┃ ┃ ┃ ┃ ┗ zh_mix_en_egs_text.txt
 ┃ ┃ ┃ ┃ ┃ ┣ test_base_model_tts_package.py
 ┃ ┃ ┃ ┃ ┃ ┗ test_base_model_tts_package_from_S3.py
 ┃ ┃ ┃ ┃ ┣ .gitignore
 ┃ ┃ ┃ ┃ ┣ Dockerfile
 ┃ ┃ ┃ ┃ ┣ LICENSE
 ┃ ┃ ┃ ┃ ┣ logo.png
 ┃ ┃ ┃ ┃ ┣ README.md
 ┃ ┃ ┃ ┃ ┣ requirements.txt
 ┃ ┃ ┃ ┃ ┗ setup.py
 ┃ ┃ ┃ ┣ account_db.py
 ┃ ┃ ┃ ┣ document_db.py
 ┃ ┃ ┃ ┣ file_db.py
 ┃ ┃ ┃ ┣ jwt_db.py
 ┃ ┃ ┃ ┣ llm_ocr.py
 ┃ ┃ ┃ ┣ ocr.py
 ┃ ┃ ┃ ┣ redis_db.py
 ┃ ┃ ┃ ┣ reminder_db.py
 ┃ ┃ ┃ ┣ stt(not_use).py
 ┃ ┃ ┃ ┣ transaction_db.py
 ┃ ┃ ┃ ┣ tts.py
 ┃ ┃ ┃ ┣ tts_compare.html
 ┃ ┃ ┃ ┣ user_db.py
 ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┣ models
 ┃ ┃ ┃ ┣ account_models.py
 ┃ ┃ ┃ ┣ auto_param_model.py
 ┃ ┃ ┃ ┣ document_models.py
 ┃ ┃ ┃ ┣ file_models.py
 ┃ ┃ ┃ ┣ reminder_models.py
 ┃ ┃ ┃ ┣ transaction_models.py
 ┃ ┃ ┃ ┣ user_models.py
 ┃ ┃ ┃ ┣ utils.py
 ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┣ routers
 ┃ ┃ ┃ ┣ account_router.py
 ┃ ┃ ┃ ┣ document_router.py
 ┃ ┃ ┃ ┣ file_router.py
 ┃ ┃ ┃ ┣ llm_ocr_router.py
 ┃ ┃ ┃ ┣ reminder_router.py
 ┃ ┃ ┃ ┣ transaction_router.py
 ┃ ┃ ┃ ┣ tts_router.py
 ┃ ┃ ┃ ┣ user_router.py
 ┃ ┃ ┃ ┗ __init__.py
 ┃ ┃ ┗ services
 ┃ ┃ ┃ ┣ account_service.py
 ┃ ┃ ┃ ┣ document_service.py
 ┃ ┃ ┃ ┣ file_service.py
 ┃ ┃ ┃ ┣ ocr_to_document.py
 ┃ ┃ ┃ ┣ reminder_service.py
 ┃ ┃ ┃ ┣ scheduler_service.py
 ┃ ┃ ┃ ┣ transaction_service.py
 ┃ ┃ ┃ ┣ user_service.py
 ┃ ┃ ┃ ┗ __init__.py
 ┃ ┣ ENV_conf
 ┃ ┗ main.py
 ┣ install_and_build.sh
 ┣ README.md
 ┗ SAMPLE_README.md
```

#### 4.4. 산업체 멘토링 의견 및 반영 사항

> **멘토 피드백 : 삼성전자 PrincipalEngineer 김규원**

OCR 및 STT, TTS,LLM 기반 분류 기능을 외부 API에 의존하기에, 외부 AI API가 다운 되면 서비스 가용성이 즉시 저하되어 사용자는 핵심 기능을 이용할 수 없게 될 우려가 있다.

컴퓨터 비전 활용 범위를 확장하여 문서 위·변조 탐지, 촬영 품질 자동 보정, 저해상도 대응 방안을 기술하면 서비스의 차별성이 강화될 수 있다.

> **반영 사항**

- 외부 API 의존성을 낮추기 위해 STT 및 TTS는 서버의 로컬 모델 기반으로 동작하도록 전환함.

- 또한 OCR의 경우 성능을 위해 외부 API 기반으로 서비스를 제공하나, 외부 API 장애 발생시 EasyOCR을 통한 대체 인식 체계를 마련함.

- 촬영 가이드 라인 제공: 사용자가 문서를 촬영할 때 화면 상에 가이드 라인을 표시하여, 문서가 지정 영역에 올바르게 위치하도록 유도하는 기능을 추가하여 피드백을 반영함.

>

---

### 5. 설치 및 실행 방법

>

#### 5.1. 설치절차 및 실행 방법

<<프론트엔드 설정>>

npm run dev

<<서버 설정>>

python -m venv .venv
or py -m venv .venv

.venv\bin\Scripts\activate
or .venv\bin\Scripts\activate

pip3 install "fastapi[standard]"

pip3 install sqlmodel

pip3 install python-dotenv

pip3 install pydantic

pip3 install passlib

pip install "passlib[bcrypt]"

pip install "python-jose[cryptography]"

pip install redis

실행 : fastapi dev main.py

DB설치 : pip3 install sqlmodel

<<RedisDatabase 설정>>

wsl 설치 -> ubuntu22.04 설치

sudo apt update

sudo apt install redis -y

//Redis 실행  
redis-cli

<<Melotts 설정>>

git clone https://github.com/myshell-ai/MeloTTS.git

cd MeloTTS

pip install -e .

python -m unidic download

<<CHAT API KEY 설정>>

export OPENAI_API_KEY="OPENAI API KEY"

export CLOVA_OCR_SECRET="clova ocr key"

export CLOVA_OCR_URL="clova ocr url"

---

### 6. 소개 자료 및 시연 영상

#### 6.1. 프로젝트 소개 자료

<img src = "./pictures/001.png">
<img src = "./pictures/002.png">
<img src = "./pictures/003.png">
<img src = "./pictures/004.png">
<img src = "./pictures/005.png">
<img src = "./pictures/006.png">
<img src = "./pictures/007.png">
<img src = "./pictures/008.png">
<img src = "./pictures/009.png">
<img src = "./pictures/010.png">
<img src = "./pictures/011.png">
<img src = "./pictures/012.png">
<img src = "./pictures/013.png">
<img src = "./pictures/014.png">
<img src = "./pictures/015.png">
<img src = "./pictures/016.png">
<img src = "./pictures/017.png">
<img src = "./pictures/019.png">
<img src = "./pictures/020.png">
<img src = "./pictures/021.png">
<img src = "./pictures/021.png">

#### 6.2. 시연 영상

> [첫 눈 서비스 : 서비스 소개 및 시연 영상](https://youtu.be/B3Di2WLdcKs?si=VrBbPhaYu6xCzrxI)

### 7. 팀 구성

#### 7.1. 팀원별 소개 및 역할 분담

> **팀장 : 성민기 (프론트엔드 FE / 기획 PM)**
>
> > 소속 : 부산대학교 정보컴퓨터공학부

- 아이디어 기획
- UI/UX 디자인 및 구성
- 캐릭터 디자인
- Front-end 개발

> **팀원 : 성도범 (백엔드 BE)**
>
> > 소속 : 부산대학교 정보컴퓨터공학부

- Back-end 설계 및 개발
- 데이터베이스 구조 설계

> **팀원 : 송시우 (인공지능 AI)**
>
> > 소속 : 부산대학교 정보컴퓨터공학부

- OCR / STT / TTS
- LLM API 연동
- Front-end 개발

#### 7.2. 팀원 별 참여 후기

> 성민기 (프론트엔드 FE / 기획 PM)

처음 아이디어 단계에서는 기술 제약을 충분히 고려하지 않아 기획이 순조롭게 보였지만, 팀장으로서 그라운드 룰과 소통 방식을 정하지 않은 채 시작하면서 팀원별 기능 이해가 엇갈리는 문제가 발생했습니다. 이를 해결하기 위해 중간에 기획을 재정렬하고 전체 기능·세부 사항을 다시 합의했으며, 그 과정에서 기획 의도와 개발 방향을 명확하게 설명하고 지속적으로 정렬하는 것이 리더의 핵심 역할임을 깨달았습니다.

프론트엔드 측면에서는 초기에 웹 중심으로만 접근했으나, 실제 사용 행태를 검토해 보니 노트북/PC보다 스마트폰 기반 거래가 우세하다는 점을 확인하여 웹/앱 병행 구조로 전환했습니다. 이 결정은 접근성과 호환성을 동시에 높이는 결과로 이어졌습니다.

UI/UX에서도 처음에는 “보기에 예쁜 앱”을 목표로 피그마 작업을 진행했지만, 시각장애인을 포함한 디지털 약자에게는 화려함보다 큰 글씨, 높은 대비, 단순한 흐름이 더 중요하다는 사용자 니즈를 확인했습니다. 이에 맞춰 기획과 디자인을 접근성 중심으로 전면 수정하고, 이를 프론트엔드 구현에 반영했습니다.

이 경험을 통해 서비스 개발은 제작자의 만족이 아니라 사용자 니즈에서 출발해야 함을 분명히 배웠고, 실제로 페르소나 정의와 5 Whys 같은 방법론을 활용해 요구를 구조화·검증하는 역량을 갖추었습니다. 아울러 프로젝트 총괄로서 의사소통 원칙 수립, 역할·책임(R&R) 명확화, 정기적 정렬의 중요성을 체득하며 리더십과 운영 역량도 함께 성장했습니다.

> 성도범 (백엔드 BE)

개별적으로 느낀 점, 협업, 기술적 어려움 극복 사례 등
프로젝트 초기에는 무언가 대단하고 엄청난 것을 개발하려는 부담감 때문에 진행하고자 하는 일이 자주 꼬였었습니다. 초반에는 각자 머릿속의 최종 결과물이 달랐습니다. 회의 마다 "우리가 지금 해결하려는 문제 한 줄 요약"을 작성해보면 달랐습니다. 프로젝트 경험 횟수도 다르고, 코딩 스타일도 달라서 시간이 갈수록 의지는 꺾였었습니다. 그럼에도, MVP 모델을 만든 뒤, MVP를 바탕으로 실제로 적용할 API 모델을 개발해나가고, 프론트엔드에서 완성된 API 모델을 사용해서 결과물이 보이기 시작하니까 다시 의지가 생겨서 열심히 할 수 있었습니다. 이번 프로젝트에서 팀원과 속도를 맞추는 것이 본인과 상대에게 얼마나 영향이 가는지 알게됐습니다. 협업 속에서, 지치지 않을 만큼만 하는게 얼마나 중요한지를 배울 수 있었습니다.

한창 프로젝트 진행 중, 기술 이름은 모르지만 기능은 알고 있는 기술을 도입해야할 부분이 있었습니다. GPT를 사용해도 알맞다고 판단되는 답변을 받을 수 없었습니다. 한창 고민하던 중, 졸업한 선배에게 자문을 구해서 답을 구했던 적이 있습니다. 기술 이름과 해결방법을 알고 나서, 어떻게 기술을 찾아 적용했는지도 자문했는데, 돌아오는 답변은 역시 레퍼런스 참고였습니다. 데이터베이스를 참고하는 기술이라면, 데이터베이스를 관리하는 SQLite 레퍼런스를 참고하면 해결이 된다고 답변받았습니다. 서버에 스케쥴링 기법을 적용해야해서 SQLite 레퍼런스를 참고해서, 폴링 기법을 찾아서 스케쥴링을 적용해서 문제를 해결할 수 있었습니다. 레퍼런스를 찾아다닐 때도, 내가 맞닥뜨린 문제의 원천이 어딘지 생각해보고 레퍼런스를 찾아야 한다는 걸 배울 수 있었습니다.

> 송시우 (인공지능 AI)

이번 캡스톤 프로젝트처럼 오랜 기간 동안 팀원들과 협업한 경험이 없어서 어려운 점이 많았습니다.
단순히 기능을 구현하는 것뿐 아니라, 프로젝트의 전체 흐름을 계획하고, 팀원들과 역할을 나누어 지속적으로 진행해 나가는 과정 자체가 저에게는 새로운 도전이었습니다.

프로젝트 진행 중에는 방향성이 중간중간 바뀌는 상황도 여러 번 있었고 그에 따라 계획을 수정하거나 기능 변경 부분에서 어려움이 많았습니다.
하지만 팀원들과 계속해서 소통하고 의견을 조율하면서 유연하게 대응하는 방법을 배울 수 있었습니다.

웹의 비중이 매우 큰 프로젝트다 보니 해당 부분에 익숙하지 않아 개발에 어려움을 많이 느꼈으나 협력과 공부를 통해 기술적 어려움을 극복해 나가는 경험을 쌓을 수 있었고 이는 매우 의미있었다 생각합니다. 이번 경험은 저에게 성장할 수 있는 좋은 기회가 되었습니다.
