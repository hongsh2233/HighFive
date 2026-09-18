import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requireLedgerAccess, errorResponse } from '@/lib/utils';

// GET /api/expenses/ledger/export?year=&month= - 간편장부 xlsx 다운로드
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId } = await requireLedgerAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: any = { organizationId };
    if (year) {
      const y = parseInt(year);
      const m = month ? parseInt(month) : null;
      const start = m ? new Date(y, m - 1, 1) : new Date(y, 0, 1);
      const end = m ? new Date(y, m, 1) : new Date(y + 1, 0, 1);
      where.entryDate = { gte: start, lt: end };
    }

    const entries = await prisma.simpleLedgerEntry.findMany({
      where,
      include: { author: { select: { name: true } } },
      orderBy: { entryDate: 'asc' },
    });

    const rows = entries.map((e) => ({
      일자: e.entryDate.toISOString().slice(0, 10),
      계정과목: e.accountItem,
      적요: e.description,
      거래처: e.counterparty ?? '',
      수입금액: e.incomeAmount,
      수입부가세: e.incomeVat,
      지출금액: e.expenseAmount,
      지출부가세: e.expenseVat,
      자산금액: e.assetAmount,
      자산부가세: e.assetVat,
      비고: e.note ?? '',
      작성자: e.author.name,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '간편장부');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ledger_${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('내보내기 중 오류가 발생했습니다.', 500);
  }
}
