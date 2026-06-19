import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/info/[id] - FAQ 항목 수정 (관리자만)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const itemId = parseInt(id);
    const body = await req.json();
    const { question, answer, order, isActive } = body;

    const item = await prisma.infoItem.update({
      where: { id: itemId },
      data: {
        ...(question !== undefined && { question: question.trim() }),
        ...(answer !== undefined && { answer: answer.trim() }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return successResponse(item, '수정되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('수정 실패', 500);
  }
}

// DELETE /api/info/[id] - FAQ 항목 삭제 (관리자만)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const itemId = parseInt(id);

    await prisma.infoItem.delete({ where: { id: itemId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('삭제 실패', 500);
  }
}
