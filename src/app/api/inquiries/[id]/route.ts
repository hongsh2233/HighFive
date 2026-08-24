import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/inquiries/[id] - 상태 변경 (검토중 / 종결) (ADMIN/LEADER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const inquiryId = parseInt(id);
    const body = await req.json();
    const { status, closeReason } = body;

    if (!['IN_REVIEW', 'CLOSED'].includes(status)) {
      return errorResponse('허용되지 않는 상태값입니다.', 400);
    }

    const inquiry = await prisma.inquiry.findFirst({ where: { id: inquiryId, organizationId } });
    if (!inquiry) {
      return errorResponse('문의를 찾을 수 없습니다.', 404);
    }

    const updated = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: {
        status,
        closeReason: status === 'CLOSED' ? closeReason || null : inquiry.closeReason,
      },
    });

    return successResponse(updated, '문의 상태가 변경되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('문의 상태 변경 중 오류가 발생했습니다.', 500);
  }
}
