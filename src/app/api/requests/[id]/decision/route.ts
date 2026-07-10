import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { createUserNotification } from '@/lib/notify';

// PATCH /api/requests/[id]/decision - 결재(승인/반려)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const requestId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const target = await prisma.request.findUnique({ where: { id: requestId } });
    if (!target) {
      return errorResponse('신청서를 찾을 수 없습니다.', 404);
    }
    if (target.status !== 'PENDING') {
      return errorResponse('이미 처리된 신청입니다.', 409);
    }

    const canDecide = target.approverId === userId || (target.approverId === null && role === 'ADMIN');
    if (!canDecide) {
      return errorResponse('결재 권한이 없습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { action, rejectReason } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return errorResponse('유효하지 않은 처리입니다.', 400, 'VALID_400');
    }
    if (action === 'REJECT' && !rejectReason?.trim()) {
      return errorResponse('반려 사유를 입력해주세요.', 400, 'VALID_400');
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approverId: userId,
        rejectReason: action === 'REJECT' ? rejectReason.trim() : null,
        decidedAt: new Date(),
      },
      include: {
        requester: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    const orgId = (session!.user as any).organizationId as number | undefined;
    const typeLabel = updated.type || '신청';
    if (action === 'APPROVE') {
      await createUserNotification(updated.requesterId, 'REQUEST_APPROVED',
        `'${updated.title}' ${typeLabel}이 승인되었습니다.`, undefined, orgId);
    } else {
      await createUserNotification(updated.requesterId, 'REQUEST_REJECTED',
        `'${updated.title}' ${typeLabel}이 반려되었습니다. 사유: ${rejectReason}`, undefined, orgId);
    }

    return successResponse(updated, action === 'APPROVE' ? '승인되었습니다.' : '반려되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('결재 처리 중 오류가 발생했습니다.', 500);
  }
}
