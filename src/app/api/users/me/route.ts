import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return errorResponse('인증이 필요합니다.', 401, 'AUTH_401');
    }

    const userId = parseInt((session.user as any).id || '0');
    if (!userId) {
      return errorResponse('사용자 정보를 찾을 수 없습니다.', 404, 'USER_404');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true, lastLoginAt: true,
      },
    });

    if (!user) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404, 'USER_404');
    }

    const tasks = await prisma.task.findMany({
      where: { workerId: userId, status: { in: ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA'] } },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ ...user, tasks }, '내 정보 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('내 정보 조회 중 오류가 발생했습니다.', 500);
  }
}
