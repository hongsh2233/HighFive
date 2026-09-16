import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireExpenseAccess, successResponse, errorResponse } from '@/lib/utils';

// GET /api/expenses/ledger/summary?year=YYYY - 월별 합계(국세청 간편장부 통계 탭과 동일한 형태)
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId } = await requireExpenseAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const entries = await prisma.simpleLedgerEntry.findMany({
      where: { organizationId, entryDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      select: { entryDate: true, incomeAmount: true, incomeVat: true, expenseAmount: true, expenseVat: true, assetAmount: true, assetVat: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      incomeAmount: 0, incomeVat: 0, expenseAmount: 0, expenseVat: 0, assetAmount: 0, assetVat: 0,
    }));

    for (const e of entries) {
      const m = months[e.entryDate.getMonth()];
      m.incomeAmount += e.incomeAmount;
      m.incomeVat += e.incomeVat;
      m.expenseAmount += e.expenseAmount;
      m.expenseVat += e.expenseVat;
      m.assetAmount += e.assetAmount;
      m.assetVat += e.assetVat;
    }

    return successResponse({ year, months }, '월별 합계 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('월별 합계 조회 중 오류가 발생했습니다.', 500);
  }
}
