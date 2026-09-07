export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  await import('../sentry.server.config');

  const { PrismaClient } = await import('@prisma/client');
  const bcryptjs = await import('bcryptjs');
  const crypto = await import('crypto');

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

    // 최고관리자(SUPERADMIN) 계정이 하나도 없을 때만 최초 1회 부트스트랩 계정을 생성한다.
    // 기존에는 매 부팅마다 admin@admin.co.kr 계정을 하드코딩된 비밀번호로 재생성/재승격했으나,
    // 그 방식은 (1) 비밀번호가 코드에 노출되고 (2) 운영자가 계정을 삭제/변경해도 계속 되살아나는 문제가 있었다.
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPERADMIN' } });
    if (superAdminCount === 0) {
      const existing = await prisma.user.findUnique({ where: { email: 'admin@admin.co.kr' } });
      if (!existing) {
        const tempPassword = crypto.randomBytes(12).toString('base64url');
        const hash = await bcryptjs.hash(tempPassword, 12);
        await prisma.user.create({
          data: {
            email: 'admin@admin.co.kr',
            name: '관리자',
            role: 'SUPERADMIN',
            passwordHash: hash,
            mustChangePassword: true,
            isActive: true,
            organizationId: org.id,
          },
        });
        console.log('='.repeat(60));
        console.log('🔐 최초 최고관리자 계정이 생성되었습니다.');
        console.log(`   이메일: admin@admin.co.kr`);
        console.log(`   임시 비밀번호: ${tempPassword}`);
        console.log('   최초 로그인 시 비밀번호 변경이 강제됩니다. 이 로그는 다시 출력되지 않으니 지금 기록해두세요.');
        console.log('='.repeat(60));
      }
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
