import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/users/me - 내 정보 및 진행 중인 업무
export async function GET(req: NextRequest) {
  try {
    const { error, session } = await requireAuth(req);
    if (error) return error;

    const session2 = await getServerSession(authOptions);
    const userId = parseInt((session2?.user as any)?.id || '0');

    if (!userId) {
      return errorResponse('사용자 정보를 찾을 수 없습니다.', 404, 'USER_404');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404, 'USER_404');
    }

    // 진행 중인 업무 조회
    const tasks = await prisma.task.findMany({
      where: {
        workerId: userId,
        status: { in: ['ASSIGNED', 'PROGRESS', 'REVIEW', 'QA'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ ...user, tasks }, '내 정보 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('내 정보 조회 중 오류가 발생했습니다.', 500);
  }
}
