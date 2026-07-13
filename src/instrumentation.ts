export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { PrismaClient } = await import('@prisma/client');
  const bcryptjs = await import('bcryptjs');

  const prisma = new PrismaClient();

  try {
    const org = await prisma.organization.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        name: 'Default Organization',
        slug: 'default',
        plan: 'FREE',
        isActive: true,
      },
    });

    const existing = await prisma.user.findUnique({ where: { email: 'admin@admin.co.kr' } });
    if (!existing) {
      const hash = await bcryptjs.hash('Admin@2024!', 12);
      await prisma.user.create({
        data: {
          email: 'admin@admin.co.kr',
          name: '관리자',
          role: 'SUPERADMIN',
          passwordHash: hash,
          isActive: true,
          organizationId: org.id,
        },
      });
    } else {
      await prisma.user.update({
        where: { email: 'admin@admin.co.kr' },
        data: { organizationId: org.id, role: 'SUPERADMIN' },
      });
    }

    const migrate = (model: any) => model.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });
    await Promise.all([
      migrate(prisma.user),
      migrate(prisma.task),
      migrate(prisma.project),
      migrate(prisma.infoItem),
      migrate(prisma.announcement),
      migrate(prisma.request),
      migrate(prisma.stickyNote),
      migrate(prisma.userPage),
      migrate(prisma.userNotification),
      migrate(prisma.template),
      migrate(prisma.integration),
    ]);

    await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        planFeatures: {
          FREE: ['info', 'requests', 'wiki', 'tasks', 'search'],
          PRO: ['info', 'requests', 'wiki', 'tasks', 'search', 'stats', 'calendar_sync'],
          ENTERPRISE: ['info', 'requests', 'wiki', 'tasks', 'search', 'stats', 'calendar_sync', 'integrations'],
        },
      },
    });

    console.log('✅ Instrumentation init complete');
  } catch (e) {
    console.error('⚠️ Instrumentation init error:', e);
  } finally {
    await prisma.$disconnect();
  }

  const { startScheduler } = await import('./lib/scheduler');
  startScheduler();
}
