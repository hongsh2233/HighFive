-- AlterTable: User (파트너 접근기간)
ALTER TABLE "users" ADD COLUMN "partnerAccessUntil" TIMESTAMP(3);

-- AlterTable: Task (완료승인은 이미 라운드7에서 추가됨, 파트너 공개 플래그 추가)
ALTER TABLE "tasks" ADD COLUMN "partnerVisible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: TaskComment (내부전용/파트너공개)
ALTER TABLE "task_comments" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'INTERNAL';

-- AlterTable: Project (건강 상태)
ALTER TABLE "projects" ADD COLUMN "healthStatus" TEXT NOT NULL DEFAULT 'NORMAL';

-- CreateTable: ProjectMilestone
CREATE TABLE "project_milestones" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_milestones_projectId_idx" ON "project_milestones"("projectId");

ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
