import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

const MAX_NOTES = 3;

// GET /api/sticky-notes - 내 메모 스티커 목록
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');

    const notes = await prisma.stickyNote.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    return successResponse(notes, '메모 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('메모 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/sticky-notes - 새 메모 스티커 생성 (최대 3개)
export async function POST() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');

    const count = await prisma.stickyNote.count({ where: { userId } });
    if (count >= MAX_NOTES) {
      return errorResponse(`메모는 최대 ${MAX_NOTES}개까지 만들 수 있습니다.`, 400, 'VALID_400');
    }

    const note = await prisma.stickyNote.create({
      data: { userId, content: '', order: count },
    });

    return successResponse(note, '메모가 추가되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('메모 생성 중 오류가 발생했습니다.', 500);
  }
}

// PUT /api/sticky-notes - 순서 일괄 저장 (드래그 재정렬)
export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids)) {
      return errorResponse('순서 목록 형식이 올바르지 않습니다.', 400, 'VALID_400');
    }

    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.stickyNote.updateMany({
          where: { id, userId },
          data: { order: index },
        })
      )
    );

    const notes = await prisma.stickyNote.findMany({ where: { userId }, orderBy: { order: 'asc' } });
    return successResponse(notes, '순서가 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('순서 저장 중 오류가 발생했습니다.', 500);
  }
}
