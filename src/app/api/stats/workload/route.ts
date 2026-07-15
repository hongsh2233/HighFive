import { NextRequest } from 'next/server';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { computeWorkloadStats } from '@/lib/workload';

// GET /api/stats/workload - 작업자별 부하량 통계
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    const workload = await computeWorkloadStats(organizationId, from, to);

    return successResponse(workload, '작업자 부하량 통계 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('통계 조회 중 오류가 발생했습니다.', 500);
  }
}
