-- 업무 등록 시 시간카운터 기본값을 꺼짐으로 변경 (HF-000067). 기존 업무의 값은 바꾸지 않는다.
ALTER TABLE "tasks" ALTER COLUMN "timeCounterEnabled" SET DEFAULT false;
