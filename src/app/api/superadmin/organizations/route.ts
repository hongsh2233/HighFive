import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, requireSuperAdmin } from '@/lib/utils';

export async function GET(_req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
      },
    });

    return successResponse(organizations);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
