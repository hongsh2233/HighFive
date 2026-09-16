-- AlterTable
ALTER TABLE "users" ADD COLUMN "canManageCardExpense" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "canManageLedger" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" DROP COLUMN "canManageExpense";
