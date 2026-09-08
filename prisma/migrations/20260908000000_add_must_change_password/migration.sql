-- 20260907000000_init을 "이미 적용됨"으로 resolve 처리하면서 실제 SQL은 실행되지 않아,
-- 그 마이그레이션에 포함되어 있던 User.mustChangePassword 컬럼이 운영 DB에 생성되지 않았다.
-- 이 마이그레이션으로 그 컬럼만 별도로 추가한다.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
