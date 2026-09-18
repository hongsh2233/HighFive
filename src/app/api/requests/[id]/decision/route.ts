import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { createUserNotification } from '@/lib/notify';
import { syncLeaveCalendarEvent } from '@/lib/google-calendar';

// PATCH /api/requests/[id]/decision - 결재(승인/반려)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const requestId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const target = await prisma.request.findFirst({
      where: { id: requestId, organizationId },
      include: { approvals: { orderBy: { order: 'asc' } } },
    });
    if (!target) {
      return errorResponse('신청서를 찾을 수 없습니다.', 404);
    }
    if (target.status !== 'PENDING') {
      return errorResponse('이미 처리된 신청입니다.', 409);
    }

    const isMultiStep = target.currentStepOrder !== null && target.approvals.length > 0;
    const currentStep = isMultiStep
      ? target.approvals.find((a) => a.order === target.currentStepOrder && a.status === 'PENDING')
      : null;

    const canDecide = isMultiStep
      ? (currentStep && currentStep.approverId === userId) || role === 'ADMIN'
      : target.approverId === userId || (target.approverId === null && role === 'ADMIN');
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

    let updated;

    if (isMultiStep && currentStep) {
      if (action === 'REJECT') {
        await prisma.$transaction([
          prisma.requestApproval.update({
            where: { id: currentStep.id },
            data: { status: 'REJECTED', rejectReason: rejectReason.trim(), decidedAt: new Date() },
          }),
          prisma.requestApproval.updateMany({
            where: { requestId, status: 'PENDING' },
            data: { status: 'SKIPPED' },
          }),
        ]);
        updated = await prisma.request.update({
          where: { id: requestId },
          data: { status: 'REJECTED', approverId: userId, rejectReason: rejectReason.trim(), decidedAt: new Date(), currentStepOrder: null },
          include: { requester: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } },
        });
      } else {
        const finalize = currentStep.canFinalize;
        const nextStep = !finalize
          ? target.approvals.find((a) => a.order > currentStep.order && a.status === 'PENDING')
          : undefined;

        await prisma.requestApproval.update({
          where: { id: currentStep.id },
          data: { status: 'APPROVED', decidedAt: new Date() },
        });
        if (finalize || !nextStep) {
          await prisma.requestApproval.updateMany({
            where: { requestId, status: 'PENDING' },
            data: { status: 'SKIPPED' },
          });
          updated = await prisma.request.update({
            where: { id: requestId },
            data: { status: 'APPROVED', approverId: userId, decidedAt: new Date(), currentStepOrder: null },
            include: { requester: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } },
          });
        } else {
          updated = await prisma.request.update({
            where: { id: requestId },
            data: { approverId: nextStep.approverId, currentStepOrder: nextStep.order },
            include: { requester: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } },
          });
        }
      }
    } else {
      updated = await prisma.request.update({
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
    }

    const orgId = (session!.user as any).organizationId as number | undefined;
    const typeLabel = updated.type || '신청';
    if (updated.status === 'APPROVED') {
      await createUserNotification(updated.requesterId, 'REQUEST_APPROVED',
        `'${updated.title}' ${typeLabel}이 승인되었습니다.`, undefined, orgId);
      if (updated.type === 'LEAVE' && updated.startDate) {
        syncLeaveCalendarEvent({
          requestId: updated.id,
          requesterId: updated.requesterId,
          title: updated.title,
          startDate: updated.startDate,
          endDate: updated.endDate ?? updated.startDate,
        }).catch(() => {});
      }
    } else if (updated.status === 'REJECTED') {
      await createUserNotification(updated.requesterId, 'REQUEST_REJECTED',
        `'${updated.title}' ${typeLabel}이 반려되었습니다. 사유: ${rejectReason}`, undefined, orgId);
    }

    // 법인카드 명세서 결제 요청: 최종 승인/반려 결과를 CardStatementPeriod에도 반영
    if (updated.type === 'CARD_STATEMENT' && (updated.status === 'APPROVED' || updated.status === 'REJECTED')) {
      await prisma.cardStatementPeriod.updateMany({
        where: { requestId: updated.id },
        data: { status: updated.status === 'APPROVED' ? 'PAID' : 'REJECTED', decidedAt: new Date() },
      });
    }

    const message =
      updated.status === 'APPROVED' ? '승인되었습니다.' :
      updated.status === 'REJECTED' ? '반려되었습니다.' :
      '다음 결재 단계로 넘어갔습니다.';
    return successResponse(updated, message);
  } catch (err) {
    console.error(err);
    return errorResponse('결재 처리 중 오류가 발생했습니다.', 500);
  }
}
