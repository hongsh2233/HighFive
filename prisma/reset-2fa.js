const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('사용법: node prisma/reset-2fa.js <email>');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`계정을 찾을 수 없습니다: ${email}`);
    return;
  }
  await prisma.user.update({ where: { email }, data: { totpEnabled: false, totpSecret: null } });
  console.log(`OK: ${email} 계정의 2FA를 초기화했습니다. 다시 로그인 후 설정에서 재등록하세요.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
