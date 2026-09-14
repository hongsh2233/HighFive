import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { createUserNotification } from '@/lib/notify';

// POST /api/users/[id]/note - 쪽지 보내기
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session, organizationId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const targetId = parseInt(id);
    const senderId = parseInt((session!.user as any).id);

    if (targetId === senderId) {
      return errorResponse('본인에게는 쪽지를 보낼 수 없습니다.', 400);
    }

    const body = await req.json();
    const message: string = (body.message || '').trim();
    if (!message) {
      return errorResponse('메시지를 입력해주세요.', 400);
    }

    const target = await prisma.user.findFirst({ where: { id: targetId, organizationId } });
    if (!target) return errorResponse('사용자를 찾을 수 없습니다.', 404);

    const senderName = session!.user?.name || '알 수 없음';
    await createUserNotification(targetId, 'NOTE', `${senderName}님의 쪽지: ${message}`, undefined, organizationId);

    return successResponse(null, '쪽지를 보냈습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('쪽지 발송 중 오류가 발생했습니다.', 500);
  }
}
