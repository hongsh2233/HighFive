-- CreateTable: 외부 서비스(JIA 등) 서버 간 인증용 API 키
CREATE TABLE "service_credentials" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'READ',
    "allowOrgWide" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_credentials_keyHash_key" ON "service_credentials"("keyHash");
CREATE INDEX "service_credentials_organizationId_idx" ON "service_credentials"("organizationId");

ALTER TABLE "service_credentials" ADD CONSTRAINT "service_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_credentials" ADD CONSTRAINT "service_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: ServiceCredential ↔ Project 명시적 범위 선택
CREATE TABLE "service_credential_projects" (
    "serviceCredentialId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_credential_projects_pkey" PRIMARY KEY ("serviceCredentialId","projectId")
);

ALTER TABLE "service_credential_projects" ADD CONSTRAINT "service_credential_projects_serviceCredentialId_fkey" FOREIGN KEY ("serviceCredentialId") REFERENCES "service_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_credential_projects" ADD CONSTRAINT "service_credential_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: 서비스 자격 증명 쓰기 요청 실행 이력 + 멱등성 키
CREATE TABLE "service_request_logs" (
    "id" SERIAL NOT NULL,
    "serviceCredentialId" INTEGER NOT NULL,
    "externalRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "taskId" INTEGER,
    "resultStatus" TEXT NOT NULL,
    "resultCommentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_request_logs_serviceCredentialId_externalRequestId_key" ON "service_request_logs"("serviceCredentialId", "externalRequestId");
CREATE INDEX "service_request_logs_taskId_idx" ON "service_request_logs"("taskId");

ALTER TABLE "service_request_logs" ADD CONSTRAINT "service_request_logs_serviceCredentialId_fkey" FOREIGN KEY ("serviceCredentialId") REFERENCES "service_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: task_comments에 서비스 연동 작성 표시/멱등성 컬럼 추가, authorId를 nullable로 변경
ALTER TABLE "task_comments" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "task_comments" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "task_comments" ADD COLUMN "externalAuthorLabel" TEXT;
ALTER TABLE "task_comments" ADD COLUMN "serviceCredentialId" INTEGER;
ALTER TABLE "task_comments" ADD COLUMN "externalRequestId" TEXT;

CREATE UNIQUE INDEX "task_comments_serviceCredentialId_externalRequestId_key" ON "task_comments"("serviceCredentialId", "externalRequestId");

ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_serviceCredentialId_fkey" FOREIGN KEY ("serviceCredentialId") REFERENCES "service_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
