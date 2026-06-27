import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcryptjs.hash('Admin@2024!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@admin.co.kr' },
    update: {},
    create: {
      email: 'admin@admin.co.kr',
      name: '관리자',
      role: 'ADMIN',
      passwordHash: hash,
      isActive: true,
    },
  });
  console.log('✅ Admin user ready:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
