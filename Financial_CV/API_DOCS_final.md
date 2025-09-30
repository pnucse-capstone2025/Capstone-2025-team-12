\*\*\*\*# 첫눈 API 명세서

## 기본 정보

- 제목: 첫눈 API
- 버전: 1.0
- 기본 URL: http://localhost:8000
- 문서 URL: /api-docs

## 공통 응답 형식

### 성공 응답

```
{
  "data": {
    // API별 응답 데이터
  }
}
```

### 에러 응답

```
{
  "data": {
    "status": "ERROR_TYPE",
    "statusCode": 400,
    "message": "에러 메시지"
  }
}
```

---

## User API

### 엔드포인트 목록

#### 1. `POST` /users/register

**요청 본문:**

```
{
  user_name,
  user_mail,
  user_login_id,
  password
}
```

**응답:**

```
{
  user_id,
  user_name,
  user_mail,
  user_login_id,
  created_at,
  access_token
}
```

#### 2. `POST` /users/login

**요청 본문:**

```
{
  user_login_id,
  password
}
```

**응답:**

```
{
  user_id,
  user_name,
  user_mail,
  user_login_id,
  created_at,
  access_token
}
```

#### 3. `GET` /users

**응답:**

```
[ ...User...]
```

#### 4. `GET` /users/{user_id}

**응답:**

```
{
  user_id,
  user_name,
  user_mail,
  user_login_id,
  created_at
}
```

#### 5. `PUT` /users/{user_id}

**요청 본문:**

```
{
  user_name,
  user_mail,
  user_login_id,
  password,
  user_locked,
  user_failed_count
}
```

**응답:**

```
{
  user_id,
  user_name,
  user_mail,
  user_login_id,
  created_at
}
```

#### 6. `DELETE` /users/{user_id}

**응답:**

```
204
```

### 필드 정의

- **user_id** — 사용자 아이디
- **user_name** — 사용자 이름
- **user_mail** — 사용자 이메일
- **user_login_id** — 사용자 로그인 아이디
- **user_login_pw** — 사용자 로그인 비밀번호(hash값이 들어갈 예정)
- **user_failed_count** — 사용자 로그인 실패 횟수
- **user_locked** — 사용자 계정 잠금
- **created_at** — 만든 시각

---

## Document API

### 필드 정의

- **document_id** — 문서 아이디
- **document_user_id** — 사용자 아이디(문서 주인 식별)
- **document_title** — 문서 제목
- **document_balance** — 문서에 기재된 금액
- **document_partner** — 문서에 기재된 거래 대상
- **document_bank** — 문서 처리에 연결된 은행
- **document_account_number** — 문서 처리에 연결된 계좌
- **document_partner_name** — 문서에 기재된 거래 대상 이름
- **document_due** — 문서에 기재된 만기일
- **created_at** — 만든 시각
- **document_classification_id** — 문서 분류 아이디
- **url** — req
- **GET** — /documents
- **GET** — /documents/user/{document_user_id}
- **GET** — /documents/{document_id}
- **POST** — /documents
- **PUT** — /documents/{document_id}
- **DELETE** — /documents/{document_id}
- **GET** — /documents/{document_id}/content
- **DELETE** — /documents/{document_id}/content
- **PATCH** — /documents/{document_id}/content

---

## Account API

### 엔드포인트 목록

#### 1. `GET` /accounts

**응답:**

```
[...Account...]
```

#### 2. `GET` /accounts/user/{account_user_id}

**응답:**

```
[...Account...]
```

#### 3. `GET` /accounts/{account_id}

**응답:**

```
{
  account_id,
  account_user_id,
  account_number,
  account_bank,
  account_balance,
  account_count,
  created_at
}
```

#### 4. `GET` /accounts/number/{account_number}

**응답:**

```
{
  account_id,
  account_user_id,
  account_number,
  account_bank,
  account_balance,
  account_count,
  created_at
}
```

#### 5. `POST` /accounts

**요청 본문:**

```
{
  account_user_id,
  account_number,
  account_bank,
  account_balance
}
```

**응답:**

```
{
  account_id,
  account_user_id,
  account_number,
  account_bank,
  account_balance,
  account_count,
  created_at
}
```

#### 6. `PUT` /accounts/{account_id}

**요청 본문:**

```
{
  account_number,
  account_bank,
  account_balance
}
```

**응답:**

```
{
  account_user_id,
  account_number,
  account_bank,
  account_balance
}
```

#### 7. `DELETE` /accounts/{account_id}

#### 8. `POST` /accounts/transfer

**요청 본문:**

```
{
  from_account_number,
  withdraw_amount,
  to_account_number,
  deposit_amount
}
```

**응답:**

```
[{
  account_id,
  account_user_id,
  account_number,
  account_bank,
  account_balance,
  account_count,
  created_at
},
{
  account_id,
  account_user_id,
  account_number,
  account_bank,
  account_balance,
  account_count,
  created_at
}]
```

### 필드 정의

- **account_id** — 계좌 아이디
- **account_balance** — 계좌 잔액
- **account_bank** — 계좌 은행
- **account_user_id** — 계좌 주인 아이디
- **account_number** — 계좌 번호
- **created_at** — 만든 시각
- **account_count** — 계좌 사용 횟수

---

## Transaction API

### 엔드포인트 목록

#### 1. `GET` /transactions

**응답:**

```
[…Transaction…]
```

## 📌 Transaction API

### 1. 거래 단건 조회 (Get Transaction by ID)

특정 거래 ID로 거래 정보를 조회합니다.

- **URL**: `/transactions/{transaction_id}`
- **Method**: `GET`
- **Content-Type**: `application/json`

#### Parameters

| Name           | Type    | In   | Required | Description            |
| -------------- | ------- | ---- | -------- | ---------------------- |
| transaction_id | integer | path | ✅       | 조회할 거래 ID (예: 2) |

#### Request Example

```bash
curl -X 'GET' \
  'http://127.0.0.1:8000/transactions/2' \
  -H 'accept: application/json'
```

#### Response Example

```json
{
  "transaction_id": 2,
  "account_id": 1,
  "amount": 10000,
  "transaction_type": "deposit",
  "partner": "은행A",
  "created_at": "2025-09-07T12:34:56"
}
```

#### 2. `POST` /transactions

**요청 본문:**

```
{
  transaction_user_id,
  transaction_partner_id,
  transaction_title,
  transaction_balance,
  transaction_due,
  transaction_close
}
```

**응답:**

```
{
  transaction_user_id,
  transaction_partner_id,
  transaction_title,
  transaction_balance,
  transaction_due,
  transaction_close,
  transaction_id,
  created_at
}
```

#### 3. `GET` /transactions/user/{transaction_user_id}

**응답:**

```
[…Transaction…]
```

#### 4. `PATCH` /transactions/{transaction_id}

**요청 본문:**

```
{
  transaction_user_id,
  transaction_partner_id,
  transaction_title,
  transaction_balance,
  transaction_due,
  transaction_close
}
```

**응답:**

```
{
  transaction_user_id,
  transaction_partner_id,
  transaction_title,
  transaction_balance,
  transaction_due,
  transaction_close,
  transaction_id,
  created_at
}
```

#### 5. `DELETE` /transactions/{transaction_id}

### 필드 정의

- **transaction_id** — 거래 아이디
- **transaction_user_id** — 거래 유저 아이디
- **transaction_title** — 거래 제목
- **transaction_balance** — 거래 금액
- **transaction_due** — 거래 만료일
- **transaction_close** — 거래 완료 여부
- **created_at** — 만든 시각
- **transaction_partner_id** — 거래 상대 아이디

---

## Reminder API

### 엔드포인트 목록

#### 1. `GET` /reminders

**응답:**

```
[…Reminder…]
```

#### 2. `POST` /reminders

**요청 본문:**

```
{
  transaction_id,
  reminder_user_id,
  reminder_title,
  due_at,
  status
}
```

**응답:**

```
{
  transaction_id,
  reminder_user_id,
  due_at,
  created_at,
  reminder_id,
  reminder_title,
  status
}
```

#### 3. `GET` /reminders/{reminder_id}

**응답:**

```
{
  reminder_id,
  transaction_id,
  reminder_user_id,
  reminder_title,
  due_at,
  status,
  created_at
}
```

#### 4. `PATCH` /reminders/{reminder_id}

**요청 본문:**

```
{
  transaction_id,
  reminder_user_id,
  reminder_title,
  due_at,
  status
}
```

**응답:**

```
{
  reminder_id,
  transaction_id,
  reminder_user_id,
  reminder_title,
  due_at,
  status,
  created_at
}
```

#### 5. `DELETE` /reminders/{reminder_id}

#### 6. `GET` /reminders/transaction/{transaction_id}

**응답:**

```
[…Reminder…]
```

#### 7. `GET` /reminders/user/{reminder_user_id}/status

**응답:**

```
[…Reminder…]
```

#### 8. `GET` /reminders/user/{reminder_user_id}

**응답:**

```
[…Reminder…]
```

### 필드 정의

- **reminder_id** — 라마인더 아이디
- **transaction_id** — 라마인더 할 거래 아이디
- **due_at** — 만기일 관리
- **status** — 거래 완료 여부(완료된 거래면 로직에 추가하지 않기 위함)
- **create_at** — 만든 시각
- **reminder_title** — 리마인더 제목
- **reminder_user_id** — 리마인더 유저 아이디

---

## Field Summary (Sheet1)

### 필드 정의

- **account_id** — 계좌 아이디
- **account_balance** — 계좌 잔액
- **account_bank** — 계좌 은행
- **account_user_id** — 계좌 주인 아이디
- **account_number** — 계좌 번호
- **created_at** — 만든 시각
- **account_count** — 계좌 사용 횟수
- **transaction_partner_id** — 거래 상대 아이디
- **reminder_id** — 라마인더 아이디
- **transaction_id** — 라마인더 할 거래 아이디
- **due_at** — 만기일 관리
- **status** — 거래 완료 여부(완료된 거래면 로직에 추가하지 않기 위함)
- **create_at** — 만든 시각
- **reminder_title** — 리마인더 제목
- **reminder_user_id** — 리마인더 유저 아이디
- **created_at** — 만든 시각
- **document_id** — 문서 아이디
- **document_user_id** — 사용자 아이디(문서 주인 식별)
- **document_title** — 문서 제목
- **document_balance** — 문서에 기재된 금액
- **document_partner** — 문서에 기재된 거래 대상
- **document_bank** — 문서 처리에 연결된 은행
- **document_account_number** — 문서 처리에 연결된 계좌
- **document_partner_number** — 문서에 기재된 거래 대상 계좌
- **document_due** — 문서에 기재된 만기일
- **created_at** — 만든 시각
- **document_classification_id** — 문서 분류 아이디
- **document_content** — 문서 내용이 저장되는 곳, OCR 분석 결과가 여기 들어감
- **document_partner_id** — 문서에 기재된 거래 대상 아이디

---

## 에러 코드

- 400: 잘못된 요청 (BAD_REQUEST)
- 401: 인증 실패 (UNAUTHORIZED)
- 403: 접근 권한 없음 (FORBIDDEN)
- 404: 리소스를 찾을 수 없음 (NOT_FOUND)
- 409: 리소스 충돌 (CONFLICT)
- 500: 서버 내부 오류 (INTERNAL_SERVER_ERROR)
