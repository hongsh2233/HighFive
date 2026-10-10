import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { sessionTaskScope } from '@/lib/task-read-scope';
import { getProjectStatuses } from '@/lib/task-status';

// GET /api/tasks/calendar - 캘린더용 업무 데이터
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year') ?? new Date().getFullYear());
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);
    if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) return errorResponse('유효한 연도와 월을 입력해 주세요.', 400, 'VALID_400');
    const userId = Number(session!.user.id);
    const role = session!.user.role;
    const scope = await sessionTaskScope(organizationId, userId, role);

    // 해당 월의 시작과 끝
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(nextMonth.getTime() - 1);

    // 해당 월의 업무 조회
    const tasks = await prisma.task.findMany({
      where: {
        AND: [scope, { targetDate: {
          gte: startDate,
          lt: nextMonth,
        } }],
      },
      include: {
        worker: { select: { id: true, name: true } },
        registrant: { select: { id: true, name: true } },
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
    const leaves = !organizationId || !['ADMIN', 'LEADER', 'WORKER'].includes(role || '') ? [] : await prisma.request.findMany({
      where: {
        organizationId,
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
        leavesByDate[dateKey].push(leave.leaveType ? `${leave.requester.name}(${leave.leaveType})` : leave.requester.name);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    });

    // 상태별 개수 통계
    const doneCodes = new Map(await Promise.all(Array.from(new Set(tasks.map(t => t.projectId))).map(async projectId => [projectId, new Set((await getProjectStatuses(projectId)).filter(s => s.isDone).map(s => s.code))] as const)));
    const summary = {
      total: tasks.length,
      assigned: tasks.filter((t) => t.status === 'ASSIGNED').length,
      progress: tasks.filter((t) => t.status === 'PROGRESS').length,
      review: tasks.filter((t) => t.status === 'REVIEW').length,
      qa: tasks.filter((t) => t.status === 'QA').length,
      done: tasks.filter((t) => doneCodes.get(t.projectId)?.has(t.status)).length,
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
