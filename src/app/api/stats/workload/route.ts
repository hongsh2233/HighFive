import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { computeWorkloadStats } from '@/lib/workload';

// GET /api/stats/workload - 작업자별 부하량 통계
// 데이터 범위: ADMIN은 조직 전체(org), LEADER는 본인이 담당 리더로 지정된 팀원만(team)
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');
    let workerIds: number[] | undefined;
    if (role === 'LEADER') {
      const subordinates = await prisma.user.findMany({ where: { organizationId, managerId: userId }, select: { id: true } });
      workerIds = subordinates.map((s) => s.id);
    }

    const workload = await computeWorkloadStats(organizationId, from, to, workerIds);

    return successResponse(workload, '작업자 부하량 통계 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('통계 조회 중 오류가 발생했습니다.', 500);
  }
}
