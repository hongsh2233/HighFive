export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('@/lib/db');
    try {
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
    } catch (e) {
      console.error('[instrumentation] info_items table setup failed:', e);
    }
  }
}
