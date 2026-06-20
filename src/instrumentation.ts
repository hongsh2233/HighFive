export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('@/lib/db');
    try {
      // info_items table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS info_items (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdBy" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT info_items_createdBy_fkey
            FOREIGN KEY ("createdBy") REFERENCES users(id)
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS info_items_order_idx ON info_items("order")`
      );

      // projects table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          "createdBy" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT projects_createdBy_fkey
            FOREIGN KEY ("createdBy") REFERENCES users(id)
        )
      `);

      // project_members table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS project_members (
          "projectId" INTEGER NOT NULL,
          "userId" INTEGER NOT NULL,
          "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY ("projectId", "userId"),
          CONSTRAINT project_members_projectId_fkey
            FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
          CONSTRAINT project_members_userId_fkey
            FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Add new columns to users if not exist
      await prisma.$executeRawUnsafe(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS "leaveDate" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS affiliation TEXT
      `);

      // Add projectId column to tasks if not exist
      await prisma.$executeRawUnsafe(`
        ALTER TABLE tasks
          ADD COLUMN IF NOT EXISTS "projectId" INTEGER REFERENCES projects(id)
      `);
    } catch (e) {
      console.error('[instrumentation] schema setup failed:', e);
    }
  }
}
