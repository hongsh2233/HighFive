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

    let projectIds: number[];
    if (role === 'ADMIN') {
      const projects = await prisma.project.findMany({ select: { id: true } });
      projectIds = projects.map((p) => p.id);
    } else {
      // 프로젝트 멤버 소속뿐 아니라, 소속과 무관하게 배정/등록된 업무가 있는 프로젝트도 포함
      // (WORKER의 업무 목록은 프로젝트 소속 여부와 무관하게 본인 배정 업무를 전부 보여주기 때문)
      const [memberProjects, assignedTasks] = await Promise.all([
        prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
        prisma.task.findMany({
          where: { OR: [{ workerId: userId }, { registrantId: userId }], projectId: { not: null } },
          select: { projectId: true },
          distinct: ['projectId'],
        }),
      ]);
      const idSet = new Set<number>();
      memberProjects.forEach((m) => idSet.add(m.projectId));
      assignedTasks.forEach((t) => { if (t.projectId) idSet.add(t.projectId); });
      projectIds = Array.from(idSet);
    }

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
