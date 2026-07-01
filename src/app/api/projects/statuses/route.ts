import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { DEFAULT_STATUSES } from '@/lib/task-status';

// GET /api/projects/statuses - 내가 접근 가능한 전체 프로젝트의 상태 단계 일괄 조회 (N+1 방지용)
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const where = role === 'ADMIN' ? {} : { members: { some: { userId } } };
    const projects = await prisma.project.findMany({ where, select: { id: true } });
    const projectIds = projects.map((p) => p.id);

    const rows = await prisma.projectStatus.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { order: 'asc' },
    });

    const byProject: Record<number, typeof rows> = {};
    rows.forEach((r) => {
      (byProject[r.projectId] ??= []).push(r);
    });

    const result: Record<number, any[]> = {};
    projectIds.forEach((id) => {
      result[id] = byProject[id]?.length ? byProject[id] : DEFAULT_STATUSES;
    });

    return successResponse({ byProject: result, default: DEFAULT_STATUSES }, '프로젝트 상태 일괄 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('프로젝트 상태 조회 중 오류가 발생했습니다.', 500);
  }
}
