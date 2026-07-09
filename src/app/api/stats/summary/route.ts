import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { getProjectStatuses } from '@/lib/task-status';

// GET /api/stats/summary - 월간 요약 통계
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // 해당 월의 시작과 끝
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    // 월간 업무 통계
    const tasks = await prisma.task.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 월간 타임로그 통계
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        task: { organizationId },
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
