import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

function parseUserId(session: any): number {
  return parseInt((session!.user as any).id || '0');
}

function isValidScope(scope: unknown): scope is 'TASK' | 'PROJECT' {
  return scope === 'TASK' || scope === 'PROJECT';
}

// GET /api/notifications/mute?scope=TASK&targetId=123 - 뮤트 여부 조회
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const scope = req.nextUrl.searchParams.get('scope');
    const targetId = parseInt(req.nextUrl.searchParams.get('targetId') || '');
    if (!isValidScope(scope) || isNaN(targetId)) {
      return errorResponse('유효하지 않은 요청입니다.', 400, 'VALID_400');
    }

    const userId = parseUserId(session);
    const mute = await prisma.notificationMute.findUnique({
      where: { userId_scope_targetId: { userId, scope, targetId } },
    });

    return successResponse({ muted: !!mute });
  } catch (err) {
    console.error(err);
    return errorResponse('조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/notifications/mute - 뮤트 설정
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const { scope, targetId } = body;
    if (!isValidScope(scope) || typeof targetId !== 'number') {
      return errorResponse('유효하지 않은 요청입니다.', 400, 'VALID_400');
    }

    const userId = parseUserId(session);
    await prisma.notificationMute.upsert({
      where: { userId_scope_targetId: { userId, scope, targetId } },
      update: {},
      create: { userId, scope, targetId },
    });

    return successResponse({ muted: true }, '알림이 꺼졌습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('설정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/notifications/mute - 뮤트 해제
export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const { scope, targetId } = body;
    if (!isValidScope(scope) || typeof targetId !== 'number') {
      return errorResponse('유효하지 않은 요청입니다.', 400, 'VALID_400');
    }

    const userId = parseUserId(session);
    await prisma.notificationMute.deleteMany({ where: { userId, scope, targetId } });

    return successResponse({ muted: false }, '알림이 켜졌습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('설정 중 오류가 발생했습니다.', 500);
  }
}
