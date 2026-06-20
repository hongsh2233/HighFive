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

  // 알 수 없는 NOT NULL 컬럼(DEFAULT 없는)을 자동으로 nullable로 변환
  // 프로덕션 DB에 예상치 못한 컬럼이 있어도 INSERT가 성공하도록 보장
  await run(`
    DO $$
    DECLARE col TEXT;
    BEGIN
      FOR col IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND is_nullable = 'NO'
          AND column_default IS NULL
          AND column_name <> 'id'
      LOOP
        EXECUTE format('ALTER TABLE projects ALTER COLUMN %I DROP NOT NULL', col);
      END LOOP;
    END $$
  `);
}
