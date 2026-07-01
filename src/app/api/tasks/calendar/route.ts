import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// GET /api/tasks/calendar - 캘린더용 업무 데이터
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // 해당 월의 시작과 끝
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 해당 월의 업무 조회
    const tasks = await prisma.task.findMany({
      where: {
        targetDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        worker: { select: { id: true, name: true } },
        planner: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: 'asc' },
    });

    // 날짜별로 그룹화
    const tasksByDate: { [key: string]: typeof tasks } = {};
    tasks.forEach((task) => {
      if (task.targetDate) {
        const dateKey = task.targetDate.toISOString().split('T')[0];
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      }
    });

    // 해당 월과 겹치는 승인된 휴가 신청 조회
    const leaves = await prisma.request.findMany({
      where: {
        type: 'LEAVE',
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: {
        requester: { select: { id: true, name: true } },
      },
    });

    // 휴가 기간의 각 날짜에 신청자 이름 매핑
    const leavesByDate: { [key: string]: string[] } = {};
    leaves.forEach((leave) => {
      if (!leave.startDate || !leave.endDate) return;
      const cursor = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
      const last = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
      while (cursor <= last) {
        const dateKey = cursor.toISOString().split('T')[0];
        if (!leavesByDate[dateKey]) leavesByDate[dateKey] = [];
        leavesByDate[dateKey].push(leave.requester.name);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    // 상태별 개수 통계
    const summary = {
      total: tasks.length,
      assigned: tasks.filter((t) => t.status === 'ASSIGNED').length,
      progress: tasks.filter((t) => t.status === 'PROGRESS').length,
      review: tasks.filter((t) => t.status === 'REVIEW').length,
      qa: tasks.filter((t) => t.status === 'QA').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
    };

    return successResponse(
      { tasksByDate, leavesByDate, summary, year, month },
      '캘린더 데이터 조회 완료'
    );
  } catch (err) {
    console.error(err);
    return errorResponse('캘린더 데이터 조회 중 오류가 발생했습니다.', 500);
  }
}
