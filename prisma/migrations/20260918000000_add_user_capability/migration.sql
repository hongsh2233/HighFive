-- CreateTable
CREATE TABLE "user_capabilities" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_capabilities_userId_key_key" ON "user_capabilities"("userId", "key");

-- AddForeignKey
ALTER TABLE "user_capabilities" ADD CONSTRAINT "user_capabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: 기존 boolean 컬럼 값을 capability row로 이관
INSERT INTO "user_capabilities" ("userId", "key", "value", "updatedAt")
SELECT "id", 'CARD_EXPENSE', true, CURRENT_TIMESTAMP FROM "users" WHERE "canManageCardExpense" = true;

INSERT INTO "user_capabilities" ("userId", "key", "value", "updatedAt")
SELECT "id", 'LEDGER', true, CURRENT_TIMESTAMP FROM "users" WHERE "canManageLedger" = true;

INSERT INTO "user_capabilities" ("userId", "key", "value", "updatedAt")
SELECT "id", 'WEEKLY_REPORT', true, CURRENT_TIMESTAMP FROM "users" WHERE "canManageWeeklyReport" = true;

-- DropColumns: 일반화된 UserCapability 테이블로 대체
ALTER TABLE "users" DROP COLUMN "canManageCardExpense";
ALTER TABLE "users" DROP COLUMN "canManageLedger";
ALTER TABLE "users" DROP COLUMN "canManageWeeklyReport";
