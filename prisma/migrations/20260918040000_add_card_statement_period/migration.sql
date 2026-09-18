-- CreateTable
CREATE TABLE "card_statement_periods" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "statementMonth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requestId" INTEGER,
    "submittedById" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_statement_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "card_statement_periods_requestId_key" ON "card_statement_periods"("requestId");
CREATE UNIQUE INDEX "card_statement_periods_organizationId_statementMonth_key" ON "card_statement_periods"("organizationId", "statementMonth");

ALTER TABLE "card_statement_periods" ADD CONSTRAINT "card_statement_periods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "card_statement_periods" ADD CONSTRAINT "card_statement_periods_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "card_statement_periods" ADD CONSTRAINT "card_statement_periods_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: CardTransaction
ALTER TABLE "card_transactions" ADD COLUMN "periodId" INTEGER;
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "card_statement_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
