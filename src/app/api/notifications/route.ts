import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const organizationId = (session!.user as any).organizationId as number | undefined;

    const notifications = await prisma.userNotification.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter((n: { isRead: boolean }) => !n.isRead).length;

    return NextResponse.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    console.error(err);
    return errorResponse('알림 조회 중 오류가 발생했습니다.', 500);
  }
}
