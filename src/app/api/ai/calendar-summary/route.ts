import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callClaude } from '@/lib/ai';

// GET /api/ai/calendar-summary?weekStart=YYYY-MM-DD — 이번 주 업무 마감/휴가 AI 요약
export async function GET(req: NextRequest) {
  try {
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const weekStartParam = new URL(req.url).searchParams.get('weekStart');
    const weekStart = weekStartParam ? new Date(weekStartParam) : new Date();
    weekStart.setHours(0, 0, 0, 0);
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dow); // 이번 주 일요일
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const taskWhere: any = {
      organizationId,
      targetDate: { gte: weekStart, lte: weekEnd },
    };
    if (role === 'WORKER') taskWhere.workerId = userId;

    const [tasks, leaves] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        select: { title: true, status: true, targetDate: true, worker: { select: { name: true } } },
        orderBy: { targetDate: 'asc' },
        take: 100,
      }),
      prisma.request.findMany({
        where: {
          organizationId,
          type: 'LEAVE',
          status: 'APPROVED',
          startDate: { lte: weekEnd },
          endDate: { gte: weekStart },
        },
        select: { title: true, startDate: true, endDate: true, requester: { select: { name: true } } },
        take: 50,
      }),
    ]);

    if (tasks.length === 0 && leaves.length === 0) {
      return successResponse({ summary: '이번 주에는 마감 예정 업무나 휴가 일정이 없습니다.' }, 'AI 요약 완료');
    }

    const taskLines = tasks.map(t =>
      `- [${t.status}] ${t.title} (담당: ${t.worker?.name ?? '미배정'}, 목표일: ${t.targetDate?.toISOString().slice(0, 10)})`
    ).join('\n');
    const leaveLines = leaves.map(l =>
      `- ${l.requester?.name}: ${l.startDate?.toISOString().slice(0, 10)} ~ ${l.endDate?.toISOString().slice(0, 10)} (${l.title})`
    ).join('\n');

    const prompt = `아래는 한 회사의 이번 주(${weekStart.toISOString().slice(0, 10)} ~ ${weekEnd.toISOString().slice(0, 10)}) 업무/휴가 일정이다. 팀 리더가 한눈에 파악할 수 있도록 한국어로 3~5문장의 간결한 브리핑을 작성해줘. 마감이 임박하거나 지난 업무, 휴가로 인한 공백이 있으면 강조해줘.

[업무 목록]
${taskLines || '(없음)'}

[휴가 목록]
${leaveLines || '(없음)'}`;

    const summary = await callClaude(prompt, 512);
    return successResponse({ summary }, 'AI 요약 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 요약 생성 중 오류가 발생했습니다.', 500);
  }
}
