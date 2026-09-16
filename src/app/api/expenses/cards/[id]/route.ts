import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireCardExpenseAccess, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/expenses/cards/[id] - 법인카드 사용내역 수정 (작성자 본인 또는 ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, userId, role } = await requireCardExpenseAccess();
    if (error) return error;

    const { id } = await params;
    const txId = parseInt(id);
    const tx = await prisma.cardTransaction.findFirst({ where: { id: txId, organizationId } });
    if (!tx) return errorResponse('사용내역을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    if (tx.userId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { cardNumberMasked, approvedAt, amount, merchant, category, projectId, description, address, approvalNo } = body;

    let resolvedProjectId: number | null | undefined = undefined;
    if (projectId !== undefined) {
      if (!projectId) {
        resolvedProjectId = null;
      } else {
        const project = await prisma.project.findFirst({ where: { id: parseInt(projectId), organizationId } });
        resolvedProjectId = project ? project.id : null;
      }
    }

    const updated = await prisma.cardTransaction.update({
      where: { id: txId },
      data: {
        ...(cardNumberMasked !== undefined && { cardNumberMasked: cardNumberMasked || null }),
        ...(approvedAt !== undefined && { approvedAt: new Date(approvedAt) }),
        ...(amount !== undefined && { amount: parseInt(amount) }),
        ...(merchant !== undefined && { merchant }),
        ...(category !== undefined && { category }),
        ...(resolvedProjectId !== undefined && { projectId: resolvedProjectId }),
        ...(description !== undefined && { description: description || null }),
        ...(address !== undefined && { address: address || null }),
        ...(approvalNo !== undefined && { approvalNo: approvalNo || null }),
      },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/expenses/cards/[id] - 법인카드 사용내역 삭제 (작성자 본인 또는 ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, userId, role } = await requireCardExpenseAccess();
    if (error) return error;

    const { id } = await params;
    const txId = parseInt(id);
    const tx = await prisma.cardTransaction.findFirst({ where: { id: txId, organizationId } });
    if (!tx) return errorResponse('사용내역을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
    if (tx.userId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    await prisma.cardTransaction.delete({ where: { id: txId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
