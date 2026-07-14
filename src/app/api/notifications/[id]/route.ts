import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/utils';

// PATCH /api/notifications/[id] - 개별 알림 읽음 처리
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return errorResponse('유효하지 않은 알림 ID입니다.', 400, 'VALID_400');
    }

    const userId = parseInt((session!.user as any).id || '0');

    const notification = await prisma.userNotification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      return errorResponse('알림을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    }

    await prisma.userNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return errorResponse('읽음 처리 중 오류가 발생했습니다.', 500);
  }
}
