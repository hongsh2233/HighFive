import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = '1234567890';
const DEMO_EMAILS = ['admin@demo.co.kr', 'abcd@demo.co.kr', 'lee123@demo.co.kr'];

async function main() {
  const hash = await bcryptjs.hash(DEMO_PASSWORD, 12);
  for (const email of DEMO_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`SKIP (계정 없음): ${email}`);
      continue;
    }
    await prisma.user.update({ where: { email }, data: { passwordHash: hash, mustChangePassword: false } });
    console.log(`OK: ${email} 비밀번호를 ${DEMO_PASSWORD}로 재설정했습니다.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
