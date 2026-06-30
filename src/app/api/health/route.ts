import { prisma } from '@/lib/db';

// GET /api/health — Railway 헬스체크용. DB 연결 상태까지 확인한다.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return Response.json({ status: 'error' }, { status: 503 });
  }
}
