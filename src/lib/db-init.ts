import { prisma } from './db';

let ready = false;

export async function ensureProjectsSchema() {
  if (ready) return;
  ready = true;

  const run = async (sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // ignore — IF NOT EXISTS handles idempotency
    }
  };

  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      "createdBy" INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      "projectManagerName" TEXT,
      "projectLeadName" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS "createdBy" INTEGER NOT NULL DEFAULT 0`);
  await run(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'`);
  await run(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS "projectManagerName" TEXT`);
  await run(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS "projectLeadName" TEXT`);

  await run(`
    CREATE TABLE IF NOT EXISTS project_members (
      "projectId" INTEGER NOT NULL,
      "userId" INTEGER NOT NULL,
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("projectId", "userId")
    )
  `);

  await run(`ALTER TABLE project_members ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
}
