export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('@/lib/db');

    const run = async (sql: string) => {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        if (!e?.message?.includes('already exists')) {
          console.error('[instrumentation] SQL failed:', e?.message);
        }
      }
    };

    // info_items
    await run(`
      CREATE TABLE IF NOT EXISTS info_items (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT info_items_createdBy_fkey FOREIGN KEY ("createdBy") REFERENCES users(id)
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS info_items_order_idx ON info_items("order")`);

    // projects
    await run(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdBy" INTEGER NOT NULL,
        "projectManagerName" TEXT,
        "projectLeadName" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT projects_createdBy_fkey FOREIGN KEY ("createdBy") REFERENCES users(id)
      )
    `);

    // project_members
    await run(`
      CREATE TABLE IF NOT EXISTS project_members (
        "projectId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("projectId", "userId"),
        CONSTRAINT project_members_projectId_fkey FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT project_members_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // alter existing tables to add new columns (idempotent for existing deployments)
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "leaveDate" TIMESTAMP(3)`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliation TEXT`);
    await run(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "projectId" INTEGER`);
    await run(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS "projectManagerName" TEXT`);
    await run(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS "projectLeadName" TEXT`);

    // FK for tasks.projectId (add separately to avoid duplicate constraint errors)
    await run(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'tasks_projectId_fkey'
        ) THEN
          ALTER TABLE tasks ADD CONSTRAINT tasks_projectId_fkey
            FOREIGN KEY ("projectId") REFERENCES projects(id);
        END IF;
      END $$
    `);
  }
}
