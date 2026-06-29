import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/utils';

export async function PATCH() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');

    await prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return errorResponse('읽음 처리 중 오류가 발생했습니다.', 500);
  }
}
