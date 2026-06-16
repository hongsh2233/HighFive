# Webhook 알림 설정 가이드

TMS는 **Slack**, **Jandi**, **카카오톡** 3가지 채널을 통해 실시간 업무 알림을 제공합니다.

---

## 1️⃣ Slack Webhook 설정

### 1.1 Slack 앱 생성
1. [Slack API 콘솔](https://api.slack.com/apps) 접속
2. **Create New App** → **From scratch** 선택
3. App Name: `TMS Bot`
4. Workspace 선택 후 생성

### 1.2 Incoming Webhooks 활성화
1. 좌측 메뉴 → **Incoming Webhooks** 클릭
2. **Add New Webhook to Workspace** 클릭
3. 알림을 받을 채널 선택 (예: `#tasks`, `#alerts`)
4. **Authorize** 클릭
5. **Webhook URL** 복사

### 1.3 환경변수 설정
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXX
```

### 1.4 테스트
```bash
curl -X POST https://hooks.slack.com/services/T00000000/B00000000/XXXX \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🔄 [진행중] 테스트 업무\n담당자: 김철수\n기획자: 이영희"
  }'
```

---

## 2️⃣ Jandi Webhook 설정

### 2.1 Jandi 커넥트 생성
1. [Jandi](https://www.jandi.com) 접속
2. 팀/채널 선택
3. 설정 → **커넥트** → **+새로운 커넥트** 추가
4. 이름: `TMS Bot`
5. 생성

### 2.2 Webhook URL 복사
1. 커넥트 선택 → **편집**
2. **Webhook URL** 복사

### 2.3 환경변수 설정
```env
JANDI_WEBHOOK_URL=https://wh.jandi.com/connect-api/webhook/xxxxx
```

### 2.4 테스트
```bash
curl -X POST https://wh.jandi.com/connect-api/webhook/xxxxx \
  -H 'Content-Type: application/json' \
  -d '{
    "body": "[진행중] 테스트 업무",
    "author": {
      "name": "TMS Bot"
    }
  }'
```

---

## 3️⃣ 카카오톡(Kakao) 설정 ⭐

### 방법 A: 카카오 플러스친구 API (추천)

#### 3.1 카카오 개발자 센터 등록
1. [카카오 개발자 센터](https://developers.kakao.com/) 접속
2. 계정 로그인 (없으면 가입)
3. **내 애플리케이션** → **애플리케이션 추가** 클릭

#### 3.2 애플리케이션 생성
```
앱 이름: TMS 알림 봇
앱 유형: 웹 서비스
비즈니스명: 회사/팀명
```

#### 3.3 카카오 로그인 설정
1. **제품** → **카카오 로그인** 활성화
2. **보안** → API Key 복사
3. **Redirect URI** 설정:
   ```
   http://localhost:3000/api/auth/callback/kakao
   https://your-domain.com/api/auth/callback/kakao
   ```

#### 3.4 접근 토큰 발급
```bash
# 카카오 로그인 후 접근 토큰 얻기
curl -X POST https://kauth.kakao.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "redirect_uri=YOUR_REDIRECT_URI" \
  -d "code=AUTHORIZATION_CODE"
```

#### 3.5 환경변수 설정
```env
KAKAO_WEBHOOK_URL=https://kapi.kakao.com/v2/api/talk/memo/default/send
KAKAO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
```

---

### 방법 B: 카카오 메시지 템플릿 (비용 발생)

카카오톡 알림톡/친구톡 사용 (유료):

#### 3.1 카카오 비즈니스 센터
1. [카카오 비즈센터](https://business.kakao.com/) 접속
2. 계약 → 알림톡 신청
3. 발송자 정보 등록

#### 3.2 API Key 발급
1. **내 서비스** → API Key 복사
2. 환경변수 설정:
```env
KAKAO_BIZ_API_URL=https://api.alimtalk.service.kakao.com
KAKAO_BIZ_API_KEY=YOUR_BIZ_API_KEY
```

---

## 🔧 모든 채널 동시 알림 활성화

### 4.1 환경변수 완전 설정
```env
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Jandi
JANDI_WEBHOOK_URL=https://wh.jandi.com/...

# Kakao (둘 중 하나)
KAKAO_WEBHOOK_URL=https://kapi.kakao.com/v2/api/talk/memo/default/send
KAKAO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN

# 또는 카카오 비즈메시지
KAKAO_BIZ_API_URL=https://api.alimtalk.service.kakao.com
KAKAO_BIZ_API_KEY=YOUR_API_KEY
```

### 4.2 테스트
```bash
npm run dev
```

업무 상태를 변경하면 설정된 모든 채널에 알림이 발송됩니다:
- 업무 제목 ✅
- 담당자 정보 ✅
- 기획자 정보 ✅
- 업무 상세 링크 ✅

---

## 📱 알림 메시지 예시

### Slack
```
🔄 [진행중] 구글 원 2TB 상품 정보 수정

담당자: 이영희
기획자: 김철수

<http://localhost:3000/tasks/42|업무 상세 보기>
```

### Jandi
```
[진행중] 구글 원 2TB 상품 정보 수정

담당자: 이영희
기획자: 김철수
```

### 카카오톡
```
🔄 [진행중] 구글 원 2TB 상품 정보 수정

담당자: 이영희
기획자: 김철수

http://localhost:3000/tasks/42
```

---

## 🚨 트러블슈팅

### 알림이 오지 않을 때

1. **환경변수 확인**
   ```bash
   echo $SLACK_WEBHOOK_URL
   echo $JANDI_WEBHOOK_URL
   echo $KAKAO_WEBHOOK_URL
   ```

2. **로그 확인**
   ```bash
   npm run dev 2>&1 | grep -i webhook
   ```

3. **API 테스트**
   ```bash
   # Slack 테스트
   curl -X POST $SLACK_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test message"}'
   ```

4. **권한 확인**
   - Slack: Webhook 활성화 여부
   - Jandi: 커넥트 URL 유효성
   - Kakao: Access Token 유효성

---

## 📋 채널별 비용

| 채널 | 비용 | 설정 난이도 | 추천도 |
|------|------|-----------|--------|
| **Slack** | 무료 | ⭐ 쉬움 | ⭐⭐⭐⭐⭐ |
| **Jandi** | 무료 | ⭐ 쉬움 | ⭐⭐⭐⭐ |
| **카톡(메모)** | 무료 | ⭐⭐ 중간 | ⭐⭐⭐ |
| **카톡(알림톡)** | 유료 | ⭐⭐ 중간 | ⭐⭐ |

---

## 🎯 권장 조합

### 스타트업/팀 (무료)
```
✅ Slack (팀 커뮤니케이션)
✅ 카카오톡 (개인 알림)
```

### 중소기업 (무료)
```
✅ Slack (팀 채널)
✅ Jandi (백업)
✅ 카카오톡 (개인)
```

### 엔터프라이즈 (비용)
```
✅ Slack (팀 협업)
✅ 카카오톡 알림톡 (공식 알림)
✅ 이메일 (중요 알림)
```

---

## 🔐 보안 주의

- Webhook URL을 공개하지 마세요
- `.env.local`은 `.gitignore`에 포함됨
- 환경변수는 프로덕션에서 안전하게 관리 (Vercel Secrets)

---

## 📚 더보기

- [Slack API 문서](https://api.slack.com/messaging/webhooks)
- [Jandi API 문서](https://jandi.kr/download/jandi_api_guide.pdf)
- [카카오 개발자 가이드](https://developers.kakao.com/)
