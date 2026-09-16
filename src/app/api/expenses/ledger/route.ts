import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireLedgerAccess, successResponse, errorResponse } from '@/lib/utils';

// GET /api/expenses/ledger - 간편장부 목록 (조직 단위, ?year=&month=)
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
      include: { author: { select: { id: true, name: true } } },
      orderBy: { entryDate: 'desc' },
    });

    return successResponse(entries, '간편장부 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('간편장부 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/expenses/ledger - 간편장부 항목 직접 등록
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, userId } = await requireLedgerAccess();
    if (error) return error;

    const body = await req.json();
    const {
      entryDate, accountItem, description, counterparty,
      incomeAmount, incomeVat, expenseAmount, expenseVat, assetAmount, assetVat, note,
    } = body;

    if (!entryDate || !accountItem?.trim() || !description?.trim()) {
      return errorResponse('필수 항목(일자/계정과목/거래내용)을 입력해주세요.', 400, 'VALID_400');
    }

    const entry = await prisma.simpleLedgerEntry.create({
      data: {
        organizationId: organizationId!,
        authorId: userId!,
        entryDate: new Date(entryDate),
        accountItem: accountItem.trim(),
        description: description.trim(),
        counterparty: counterparty?.trim() || null,
        incomeAmount: parseInt(incomeAmount) || 0,
        incomeVat: parseInt(incomeVat) || 0,
        expenseAmount: parseInt(expenseAmount) || 0,
        expenseVat: parseInt(expenseVat) || 0,
        assetAmount: parseInt(assetAmount) || 0,
        assetVat: parseInt(assetVat) || 0,
        note: note?.trim() || null,
        source: 'MANUAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(entry, '간편장부 항목이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('간편장부 항목 등록 중 오류가 발생했습니다.', 500);
  }
}
