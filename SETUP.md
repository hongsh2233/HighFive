# TMS 로컬 개발 환경 설정 가이드

## 📋 사전 요구사항

- Node.js 18+ 
- PostgreSQL 12+
- npm 또는 yarn

---

## 🚀 설정 단계

### 1. 저장소 복제 (이미 완료)
```bash
git clone <repository-url>
cd tms
```

### 2. 패키지 설치
```bash
npm install
```

### 3. PostgreSQL 설정

#### 옵션 A: Docker 사용 (권장)
```bash
docker run --name tms-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tms_db \
  -p 5432:5432 \
  -d postgres:15
```

#### 옵션 B: 로컬 설치
**macOS (Homebrew)**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb tms_db
```

**Ubuntu/Debian**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb tms_db
```

### 4. 환경변수 설정

`.env.local` 파일이 이미 생성되어 있습니다.
필요에 따라 수정하세요:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tms_db
NEXTAUTH_SECRET=<생성된 비밀키>
NEXTAUTH_URL=http://localhost:3000
```

**NEXTAUTH_SECRET 생성:**
```bash
openssl rand -base64 32
```

### 5. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
npm run db:push

# 또는 마이그레이션 dev 모드 (권장)
npm run db:migrate
```

### 6. 샘플 데이터 생성 (선택사항)

```bash
npm run db:seed
```

**생성되는 테스트 계정:**
- **관리자**: admin@example.com / admin123
- **기획자**: planner@example.com / planner123
- **작업자1**: worker1@example.com / worker123
- **작업자2**: worker2@example.com / worker123

### 7. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 📊 데이터베이스 관리

### Prisma Studio 실행
```bash
npm run db:studio
```
→ `http://localhost:5555` 에서 GUI로 데이터 확인/편집

### 마이그레이션 상태 확인
```bash
npx prisma migrate status
```

### 새로운 마이그레이션 생성
```bash
npx prisma migrate dev --name <마이그레이션-이름>
```

---

## 🧪 테스트

### 로그인 테스트
1. `http://localhost:3000` 접속
2. 위의 테스트 계정으로 로그인
3. 대시보드 및 업무 목록 확인

### API 테스트 (curl)
```bash
# 로그인
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 업무 목록 조회
curl http://localhost:3000/api/tasks
```

---

## 📝 주요 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|----------|------|
| POST | `/api/auth/signin` | 로그인 |
| GET | `/api/tasks` | 업무 목록 |
| POST | `/api/tasks` | 업무 생성 |
| GET | `/api/tasks/[id]` | 업무 상세 |
| PATCH | `/api/tasks/[id]` | 업무 수정 |
| PATCH | `/api/tasks/[id]/status` | 상태 변경 |

---

## 🐛 문제 해결

### 데이터베이스 연결 실패
```bash
# PostgreSQL 실행 확인
psql -U postgres -d tms_db -c "SELECT 1;"

# 포트 확인 (5432가 사용 중인지 확인)
lsof -i :5432
```

### Prisma 캐시 문제
```bash
rm -rf node_modules/.prisma
npm run db:generate
```

### 마이그레이션 상태 초기화 (위험)
```bash
# 모든 데이터 삭제 후 재마이그레이션
npm run db:push -- --force-reset
```

---

## 📚 유용한 명령어

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# Linting
npm run lint

# Prisma 스키마 검증
npx prisma validate
```

---

## 🔗 문서

- [Next.js 문서](https://nextjs.org/docs)
- [Prisma 문서](https://www.prisma.io/docs/)
- [NextAuth.js 문서](https://next-auth.js.org/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

---

## ✅ 다음 단계

- [ ] 로컬 개발 환경 설정 완료
- [ ] 샘플 데이터로 기본 기능 테스트
- [ ] Phase 2: 타이머 및 칸반 보드 구현
- [ ] Phase 3: Webhook 및 통계 구현
