import { prisma } from '@/lib/db';
import { requireCardExpenseAccess, successResponse, errorResponse } from '@/lib/utils';
import { getCurrentStatementWindow, isPeriodEditable } from '@/lib/card-statement';

// GET /api/expenses/cards/period/current - 이번 입력창 대상 월의 명세서 기간 상태 조회
export async function GET() {
  try {
    const { error, organizationId } = await requireCardExpenseAccess();
    if (error) return error;

    const { statementMonth, isWindowOpen } = getCurrentStatementWindow();
    const period = await prisma.cardStatementPeriod.findUnique({
      where: { organizationId_statementMonth: { organizationId: organizationId!, statementMonth } },
      include: {
        submittedBy: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
    });

    return successResponse({
      statementMonth,
      isWindowOpen,
      period,
      isEditable: period ? isPeriodEditable(period) : isWindowOpen,
    }, '조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('조회 중 오류가 발생했습니다.', 500);
  }
}
