import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireCardExpenseAccess, successResponse, errorResponse } from '@/lib/utils';

// POST /api/expenses/cards/period/submit - 이번 달 법인카드 명세서 입력 완료 → 결제 요청(결재선 태움)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireCardExpenseAccess();
    if (error) return error;

    const requesterId = parseInt((session!.user as any).id || '0');
    const body = await req.json().catch(() => ({}));
    const periodId = body.periodId ? parseInt(body.periodId) : null;
    if (!periodId) return errorResponse('periodId가 필요합니다.', 400, 'VALID_400');

    const period = await prisma.cardStatementPeriod.findFirst({
      where: { id: periodId, organizationId },
      include: { _count: { select: { transactions: true } } },
    });
    if (!period) return errorResponse('명세서 기간을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    if (period.status !== 'DRAFT') {
      return errorResponse('이미 결제 요청되었거나 처리된 기간입니다.', 409, 'ALREADY_SUBMITTED');
    }
    if (period._count.transactions === 0) {
      return errorResponse('등록된 사용내역이 없습니다.', 400, 'VALID_400');
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) return errorResponse('사용자를 찾을 수 없습니다.', 404);

    // 결재선 재사용(라운드3~4에서 만든 다단계 결재) — 없으면 담당 리더 단일 결재로 폴백
    const lineSteps = await prisma.approvalLineStep.findMany({ where: { organizationId }, orderBy: { order: 'asc' } });

    const request = await prisma.request.create({
      data: {
        type: 'CARD_STATEMENT',
        title: `법인카드 명세서 결제 요청 (${period.statementMonth})`,
        content: `${period.statementMonth} 법인카드 사용내역 ${period._count.transactions}건`,
        requesterId,
        approverId: lineSteps[0]?.approverId ?? requester.managerId,
        currentStepOrder: lineSteps.length > 0 ? lineSteps[0].order : null,
        status: 'PENDING',
        organizationId,
      },
    });

    if (lineSteps.length > 0) {
      await prisma.requestApproval.createMany({
        data: lineSteps.map((s) => ({
          requestId: request.id,
          order: s.order,
          label: s.label,
          approverId: s.approverId,
          canFinalize: s.canFinalize,
        })),
      });
    }

    const updated = await prisma.cardStatementPeriod.update({
      where: { id: period.id },
      data: { status: 'PENDING_APPROVAL', requestId: request.id, submittedById: requesterId, submittedAt: new Date() },
    });

    return successResponse(updated, '결제 요청이 접수되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('결제 요청 중 오류가 발생했습니다.', 500);
  }
}
