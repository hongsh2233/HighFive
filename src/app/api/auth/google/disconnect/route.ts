import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { prisma } from '@/lib/db';

// DELETE /api/auth/google/disconnect — Google 캘린더 연동 해제
export async function DELETE() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const userId = parseInt((session!.user as any).id || '0');
    await prisma.$transaction([
      prisma.googleCalendarEvent.deleteMany({ where: { userId } }),
      prisma.googleCalendarConnection.deleteMany({ where: { userId } }),
    ]);
    return successResponse(null, 'Google 캘린더 연동이 해제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('연동 해제 중 오류가 발생했습니다.', 500);
  }
}
