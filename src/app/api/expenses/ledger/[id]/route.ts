import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireLedgerAccess, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/expenses/ledger/[id] - 간편장부 항목 수정 (작성자 본인 또는 ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, userId, role } = await requireLedgerAccess();
    if (error) return error;

    const { id } = await params;
    const entryId = parseInt(id);
    const entry = await prisma.simpleLedgerEntry.findFirst({ where: { id: entryId, organizationId } });
    if (!entry) return errorResponse('항목을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    if (entry.authorId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const {
      entryDate, accountItem, description, counterparty,
      incomeAmount, incomeVat, expenseAmount, expenseVat, assetAmount, assetVat, note,
    } = body;

    const updated = await prisma.simpleLedgerEntry.update({
      where: { id: entryId },
      data: {
        ...(entryDate !== undefined && { entryDate: new Date(entryDate) }),
        ...(accountItem !== undefined && { accountItem: accountItem.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(counterparty !== undefined && { counterparty: counterparty?.trim() || null }),
        ...(incomeAmount !== undefined && { incomeAmount: parseInt(incomeAmount) || 0 }),
        ...(incomeVat !== undefined && { incomeVat: parseInt(incomeVat) || 0 }),
        ...(expenseAmount !== undefined && { expenseAmount: parseInt(expenseAmount) || 0 }),
        ...(expenseVat !== undefined && { expenseVat: parseInt(expenseVat) || 0 }),
        ...(assetAmount !== undefined && { assetAmount: parseInt(assetAmount) || 0 }),
        ...(assetVat !== undefined && { assetVat: parseInt(assetVat) || 0 }),
        ...(note !== undefined && { note: note?.trim() || null }),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/expenses/ledger/[id] - 간편장부 항목 삭제 (작성자 본인 또는 ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, userId, role } = await requireLedgerAccess();
    if (error) return error;

    const { id } = await params;
    const entryId = parseInt(id);
    const entry = await prisma.simpleLedgerEntry.findFirst({ where: { id: entryId, organizationId } });
    if (!entry) return errorResponse('항목을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    if (entry.authorId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    await prisma.simpleLedgerEntry.delete({ where: { id: entryId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
