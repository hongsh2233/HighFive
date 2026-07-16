import { prisma } from '@/lib/db';
import { requireSuperAdmin, successResponse, errorResponse } from '@/lib/utils';

// GET /api/superadmin/demo-requests - 데모 신청 목록 (SUPERADMIN 전용)
export async function GET() {
  try {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const requests = await prisma.demoRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(requests);
  } catch (err) {
    console.error(err);
    return errorResponse('조회 중 오류가 발생했습니다.', 500);
  }
}
