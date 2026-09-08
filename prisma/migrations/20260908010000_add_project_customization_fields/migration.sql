-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "customLabels" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "simpleMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wikiEnabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "project_roles" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "userId" INTEGER,
    "userName" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_roles_projectId_order_idx" ON "project_roles"("projectId", "order");

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
