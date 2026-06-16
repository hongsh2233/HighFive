import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 샘플 사용자 생성
  const adminPassword = await bcryptjs.hash('admin123', 12);
  const plannerPassword = await bcryptjs.hash('planner123', 12);
  const workerPassword = await bcryptjs.hash('worker123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '관리자',
      role: 'ADMIN',
      passwordHash: adminPassword,
      isActive: true,
    },
  });

  const planner = await prisma.user.upsert({
    where: { email: 'planner@example.com' },
    update: {},
    create: {
      email: 'planner@example.com',
      name: '기획자 김철수',
      role: 'PLANNER',
      passwordHash: plannerPassword,
      isActive: true,
    },
  });

  const worker1 = await prisma.user.upsert({
    where: { email: 'worker1@example.com' },
    update: {},
    create: {
      email: 'worker1@example.com',
      name: '작업자 이영희',
      role: 'WORKER',
      passwordHash: workerPassword,
      isActive: true,
    },
  });

  const worker2 = await prisma.user.upsert({
    where: { email: 'worker2@example.com' },
    update: {},
    create: {
      email: 'worker2@example.com',
      name: '작업자 박민준',
      role: 'WORKER',
      passwordHash: workerPassword,
      isActive: true,
    },
  });

  console.log('✅ Users created:', [admin.id, planner.id, worker1.id, worker2.id]);

  // 샘플 업무 생성
  const task1 = await prisma.task.create({
    data: {
      title: '[DCBGIT-39085] 구글 원 2TB 상품 정보 수정',
      rmsNo: 'DCBGIT-39085',
      plannerId: planner.id,
      workerId: worker1.id,
      status: 'PROGRESS',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
      notes: 'PC/MO 모두 반영 필요',
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: '[DCBGIT-39086] 배너 이미지 최적화',
      rmsNo: 'DCBGIT-39086',
      plannerId: planner.id,
      workerId: worker2.id,
      status: 'ASSIGNED',
      targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5일 후
      notes: '해상도 2배 이상 필요',
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: '[DCBGIT-39087] API 문서 작성',
      rmsNo: 'DCBGIT-39087',
      plannerId: planner.id,
      workerId: worker1.id,
      status: 'REVIEW',
      targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3일 후
      notes: 'Swagger 형식으로 작성',
    },
  });

  console.log('✅ Tasks created:', [task1.id, task2.id, task3.id]);

  // 샘플 템플릿 생성
  const template = await prisma.template.create({
    data: {
      name: '정기 배너 교체',
      defaultTitle: '배너 이미지 수정',
      defaultPlannerId: planner.id,
      guideText: '- 사이즈: 1920x1080\n- 형식: PNG 또는 JPG\n- 색상 모드: RGB',
    },
  });

  console.log('✅ Template created:', template.id);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
