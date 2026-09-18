-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "requireCompletionApproval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "recurring_task_rules" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "workerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "config" JSONB,
    "targetDaysOffset" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_task_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_task_rules_organizationId_isActive_nextRunAt_idx" ON "recurring_task_rules"("organizationId", "isActive", "nextRunAt");

-- AddForeignKey
ALTER TABLE "recurring_task_rules" ADD CONSTRAINT "recurring_task_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_task_rules" ADD CONSTRAINT "recurring_task_rules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recurring_task_rules" ADD CONSTRAINT "recurring_task_rules_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_task_rules" ADD CONSTRAINT "recurring_task_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
