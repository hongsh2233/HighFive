import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { isGoogleCalendarConfigured } from '@/lib/google-calendar';

// GET /api/auth/google/status — 내 Google 캘린더 연동 상태 조회
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const userId = parseInt((session!.user as any).id || '0');
    const conn = await prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { connectedAt: true },
    });

    return successResponse({
      configured: isGoogleCalendarConfigured(),
      connected: !!conn,
      connectedAt: conn?.connectedAt ?? null,
    }, '연동 상태 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('연동 상태 조회 중 오류가 발생했습니다.', 500);
  }
}
