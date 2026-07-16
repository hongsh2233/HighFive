import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, successResponse, errorResponse } from '@/lib/utils';

const VALID_STATUSES = ['PENDING', 'CONTACTED', 'CLOSED'];

// PATCH /api/superadmin/demo-requests/[id] - 상태 변경 (SUPERADMIN 전용)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const { id } = await params;
    const requestId = parseInt(id);
    const body = await req.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse('유효하지 않은 상태입니다.', 400, 'VALID_400');
    }

    const updated = await prisma.demoRequest.update({
      where: { id: requestId },
      data: { status },
    });

    return successResponse(updated, '상태가 변경되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/superadmin/demo-requests/[id] - 삭제 (SUPERADMIN 전용)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const { id } = await params;
    await prisma.demoRequest.delete({ where: { id: parseInt(id) } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
