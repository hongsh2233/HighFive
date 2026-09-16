-- AlterTable
ALTER TABLE "requests" ADD COLUMN "currentStepOrder" INTEGER;

-- CreateTable
CREATE TABLE "approval_line_steps" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "approverId" INTEGER NOT NULL,
    "canFinalize" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_line_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_line_steps_organizationId_order_idx" ON "approval_line_steps"("organizationId", "order");

-- AddForeignKey
ALTER TABLE "approval_line_steps" ADD CONSTRAINT "approval_line_steps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_line_steps" ADD CONSTRAINT "approval_line_steps_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "request_approvals" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "approverId" INTEGER NOT NULL,
    "canFinalize" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_approvals_requestId_order_idx" ON "request_approvals"("requestId", "order");

-- CreateIndex
CREATE INDEX "request_approvals_approverId_status_idx" ON "request_approvals"("approverId", "status");

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
