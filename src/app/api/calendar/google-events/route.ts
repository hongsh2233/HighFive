import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { listGoogleCalendarEvents } from '@/lib/google-calendar';

// GET /api/calendar/google-events - 연동된 구글 캘린더 일정을 날짜별로 조회
export async function GET(req: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const connected = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
    if (!connected) {
      return successResponse({ connected: false, eventsByDate: {} }, '구글 캘린더 미연동');
    }

    const timeMin = new Date(year, month - 1, 1);
    const timeMax = new Date(year, month, 0, 23, 59, 59);
    const events = await listGoogleCalendarEvents(userId, timeMin, timeMax);

    const eventsByDate: Record<string, { id: string; title: string }[]> = {};
    events.forEach((ev) => {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push({ id: ev.id, title: ev.title });
    });

    return successResponse({ connected: true, eventsByDate }, '구글 캘린더 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('구글 캘린더 조회 중 오류가 발생했습니다.', 500);
  }
}
