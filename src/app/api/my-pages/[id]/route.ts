import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/my-pages/[id] - 문서 수정 (본인 소유만)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const pageId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');

    const page = await prisma.userPage.findUnique({ where: { id: pageId } });
    if (!page || page.userId !== userId) {
      return errorResponse('문서를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    }

    const body = await req.json();
    const { title, content } = body;

    const updated = await prisma.userPage.update({
      where: { id: pageId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
      },
    });

    return successResponse(updated, '문서가 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('문서 저장 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/my-pages/[id] - 문서 삭제 (본인 소유만)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const pageId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');

    const page = await prisma.userPage.findUnique({ where: { id: pageId } });
    if (!page || page.userId !== userId) {
      return errorResponse('문서를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    }

    await prisma.userPage.delete({ where: { id: pageId } });

    return successResponse(null, '문서가 삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('문서 삭제 중 오류가 발생했습니다.', 500);
  }
}
