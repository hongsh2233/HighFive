import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireCardExpenseAccess, errorResponse } from '@/lib/utils';

// GET /api/expenses/cards/export?periodId=&year=&month= - 법인카드 사용내역 xlsx 다운로드
// 외부 저장소(Drive 등) 연동이 아직 준비되지 않아, 우선 다운로드로 결과물을 내보낼 수 있게 함.
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId, userId, role } = await requireCardExpenseAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get('periodId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: any = { organizationId };
    if (role !== 'ADMIN') where.userId = userId;
    if (periodId) where.periodId = parseInt(periodId);
    if (year) {
      const y = parseInt(year);
      const m = month ? parseInt(month) : null;
      const start = m ? new Date(y, m - 1, 1) : new Date(y, 0, 1);
      const end = m ? new Date(y, m, 1) : new Date(y + 1, 0, 1);
      where.approvedAt = { gte: start, lt: end };
    }

    const transactions = await prisma.cardTransaction.findMany({
      where,
      include: { user: { select: { name: true } }, project: { select: { name: true } } },
      orderBy: { approvedAt: 'asc' },
    });

    const rows = transactions.map((t) => ({
      승인일시: t.approvedAt.toISOString().slice(0, 16).replace('T', ' '),
      카드번호: t.cardNumberMasked ?? '',
      금액: t.amount,
      거래처: t.merchant,
      항목: t.category,
      프로젝트: t.project?.name ?? t.projectNameRaw ?? '',
      사용내역: t.description ?? '',
      주소: t.address ?? '',
      승인번호: t.approvalNo ?? '',
      등록자: t.user.name,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '법인카드사용내역');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="card_transactions_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('내보내기 중 오류가 발생했습니다.', 500);
  }
}
