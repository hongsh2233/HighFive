import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/sticky-notes/[id] - 메모 내용/색상 수정 (본인 소유만)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const noteId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');

    const note = await prisma.stickyNote.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
      return errorResponse('메모를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    }

    const body = await req.json();
    const { content, color } = body;

    const updated = await prisma.stickyNote.update({
      where: { id: noteId },
      data: {
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color: color || null }),
      },
    });

    return successResponse(updated, '메모가 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('메모 저장 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/sticky-notes/[id] - 메모 삭제 (본인 소유만)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const noteId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');

    const note = await prisma.stickyNote.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
      return errorResponse('메모를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    }

    await prisma.stickyNote.delete({ where: { id: noteId } });

    return successResponse(null, '메모가 삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('메모 삭제 중 오류가 발생했습니다.', 500);
  }
}
