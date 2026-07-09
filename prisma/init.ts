import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 기본 조직 생성 (기존 단일 조직 데이터용)
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
  console.log('✅ Default organization ready:', org.slug);

  const hash = await bcryptjs.hash('Admin@2024!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@admin.co.kr' },
    update: { organizationId: org.id, role: 'SUPERADMIN' },
    create: {
      email: 'admin@admin.co.kr',
      name: '관리자',
      role: 'SUPERADMIN',
      passwordHash: hash,
      isActive: true,
      organizationId: org.id,
    },
  });
  console.log('✅ Admin user ready:', user.email);

  // 기존 사용자/데이터 마이그레이션 — organizationId가 null인 경우 default 조직으로 할당
  await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.task.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.project.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.infoItem.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.announcement.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.request.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.stickyNote.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.userPage.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.userNotification.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  await prisma.template.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });

  // Integration 마이그레이션: 기존 global 통합을 default 조직으로 이동
  // organizationId가 null인 integration은 default org로 할당
  await prisma.integration.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });

  console.log('✅ Migration to default organization complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
