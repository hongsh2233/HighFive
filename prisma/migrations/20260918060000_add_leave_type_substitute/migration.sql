-- AlterTable
ALTER TABLE "requests" ADD COLUMN "leaveType" TEXT;
ALTER TABLE "requests" ADD COLUMN "substituteUserId" INTEGER;

ALTER TABLE "requests" ADD CONSTRAINT "requests_substituteUserId_fkey" FOREIGN KEY ("substituteUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
