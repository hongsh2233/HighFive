-- AlterTable
ALTER TABLE "users" ADD COLUMN "resumeFilename" TEXT;
ALTER TABLE "users" ADD COLUMN "resumeMimeType" TEXT;
ALTER TABLE "users" ADD COLUMN "resumeSize" INTEGER;
ALTER TABLE "users" ADD COLUMN "resumeData" BYTEA;
