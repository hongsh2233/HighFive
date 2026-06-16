import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/stats/summary - 월간 요약 통계
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireRole(req, ['ADMIN', 'PLANNER']);
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
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 월간 타임로그 통계
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = {
      month: month + 1,
      year,
      tasks: {
        total: tasks.length,
        assigned: tasks.filter((t) => t.status === 'ASSIGNED').length,
        progress: tasks.filter((t) => t.status === 'PROGRESS').length,
        review: tasks.filter((t) => t.status === 'REVIEW').length,
        qa: tasks.filter((t) => t.status === 'QA').length,
        done: tasks.filter((t) => t.status === 'DONE').length,
        completionRate: tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'DONE').length / tasks.length) * 100) : 0,
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
