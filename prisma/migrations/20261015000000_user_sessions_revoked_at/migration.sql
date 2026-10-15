-- 관리자 비밀번호 초기화 시 기존 로그인 세션을 무효화하기 위한 기준 시각 (HF-000059). 기존 사용자는 NULL(영향 없음).
ALTER TABLE "users" ADD COLUMN "sessionsRevokedAt" TIMESTAMP(3);
