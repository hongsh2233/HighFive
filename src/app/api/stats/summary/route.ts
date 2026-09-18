import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { getProjectStatuses } from '@/lib/task-status';

// GET /api/stats/summary - 월간 요약 통계
// 데이터 범위: ADMIN은 조직 전체(org), LEADER는 본인 소속 프로젝트 + 담당 팀원 범위만(team)
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // 해당 월의 시작과 끝
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');

    let teamScope: { projectId?: { in: number[] }; workerId?: { in: number[] } } | undefined;
    if (role === 'LEADER') {
      const [myProjects, subordinates] = await Promise.all([
        prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
        prisma.user.findMany({ where: { organizationId, managerId: userId }, select: { id: true } }),
      ]);
      teamScope = {
        projectId: { in: myProjects.map((p) => p.projectId) },
        workerId: { in: subordinates.map((s) => s.id) },
      };
    }
    const scopeOr = teamScope ? { OR: [{ projectId: teamScope.projectId }, { workerId: teamScope.workerId }] } : {};

    // 월간 업무 통계
    const tasks = await prisma.task.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...scopeOr,
      },
    });

    // 월간 타임로그 통계 (LEADER는 팀 범위 업무의 로그만)
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        task: { organizationId, ...scopeOr },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 프로젝트별 "완료" 단계 코드 집합 구성 (커스텀 상태 대응, 완료율 계산용)
    const distinctProjectIds = Array.from(new Set<number | null>(tasks.map((t) => t.projectId)));
    const doneCodesByProject = new Map<number | null, Set<string>>();
    await Promise.all(
      distinctProjectIds.map(async (pid) => {
        const statuses = await getProjectStatuses(pid);
        doneCodesByProject.set(pid, new Set(statuses.filter((s) => s.isDone).map((s) => s.code)));
      })
    );
    const isTaskDone = (t: (typeof tasks)[number]) => doneCodesByProject.get(t.projectId)?.has(t.status) ?? false;
    const doneCount = tasks.filter(isTaskDone).length;

    const summary = {
      month: month + 1,
      year,
      tasks: {
        total: tasks.length,
        assigned: tasks.filter((t) => t.status === 'ASSIGNED').length,
        progress: tasks.filter((t) => t.status === 'PROGRESS').length,
        review: tasks.filter((t) => t.status === 'REVIEW').length,
        qa: tasks.filter((t) => t.status === 'QA').length,
        done: doneCount,
        completionRate: tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0,
      },
      timeLogs: {
        total: timeLogs.length,
        totalHours: Math.round(timeLogs.reduce((sum, log) => sum + (log.finalHours || 0), 0) * 100) / 100,
        averageHoursPerLog: timeLogs.length > 0 ? Math.round((timeLogs.reduce((sum, log) => sum + (log.finalHours || 0), 0) / timeLogs.length) * 100) / 100 : 0,
      },
    };

    return successResponse(summary, '월간 요약 통계 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('통계 조회 중 오류가 발생했습니다.', 500);
  }
}
