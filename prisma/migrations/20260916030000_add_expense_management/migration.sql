-- AlterTable
ALTER TABLE "users" ADD COLUMN "canManageExpense" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "card_transactions" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardNumberMasked" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "merchant" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "projectId" INTEGER,
    "projectNameRaw" TEXT,
    "description" TEXT,
    "address" TEXT,
    "approvalNo" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_transactions_organizationId_userId_approvedAt_idx" ON "card_transactions"("organizationId", "userId", "approvedAt");

-- AddForeignKey
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "simple_ledger_entries" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "accountItem" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "counterparty" TEXT,
    "incomeAmount" INTEGER NOT NULL DEFAULT 0,
    "incomeVat" INTEGER NOT NULL DEFAULT 0,
    "expenseAmount" INTEGER NOT NULL DEFAULT 0,
    "expenseVat" INTEGER NOT NULL DEFAULT 0,
    "assetAmount" INTEGER NOT NULL DEFAULT 0,
    "assetVat" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simple_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simple_ledger_entries_organizationId_entryDate_idx" ON "simple_ledger_entries"("organizationId", "entryDate");

-- AddForeignKey
ALTER TABLE "simple_ledger_entries" ADD CONSTRAINT "simple_ledger_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simple_ledger_entries" ADD CONSTRAINT "simple_ledger_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
