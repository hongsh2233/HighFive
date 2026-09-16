import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireCardExpenseAccess, successResponse, errorResponse } from '@/lib/utils';

// GET /api/expenses/cards - 법인카드 사용내역 목록 (본인 것만, ADMIN은 전체 또는 특정 사용자 지정 조회)
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId, userId, role } = await requireCardExpenseAccess();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const targetUserId = searchParams.get('userId');

    const where: any = { organizationId };
    if (role === 'ADMIN' && targetUserId) {
      where.userId = parseInt(targetUserId);
    } else if (role !== 'ADMIN') {
      where.userId = userId;
    }
    if (year) {
      const y = parseInt(year);
      const m = month ? parseInt(month) : null;
      const start = m ? new Date(y, m - 1, 1) : new Date(y, 0, 1);
      const end = m ? new Date(y, m, 1) : new Date(y + 1, 0, 1);
      where.approvedAt = { gte: start, lt: end };
    }

    const transactions = await prisma.cardTransaction.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { approvedAt: 'desc' },
    });

    return successResponse(transactions, '법인카드 사용내역 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('법인카드 사용내역 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/expenses/cards - 법인카드 사용내역 직접 등록
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, userId } = await requireCardExpenseAccess();
    if (error) return error;

    const body = await req.json();
    const { cardNumberMasked, approvedAt, amount, merchant, category, projectId, description, address, approvalNo } = body;

    if (!approvedAt || !amount || !merchant || !category) {
      return errorResponse('필수 항목(일시/금액/거래처/항목)을 입력해주세요.', 400, 'VALID_400');
    }

    let resolvedProjectId: number | null = null;
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: parseInt(projectId), organizationId } });
      if (project) resolvedProjectId = project.id;
    }

    const transaction = await prisma.cardTransaction.create({
      data: {
        organizationId: organizationId!,
        userId: userId!,
        cardNumberMasked: cardNumberMasked || null,
        approvedAt: new Date(approvedAt),
        amount: parseInt(amount),
        merchant,
        category,
        projectId: resolvedProjectId,
        description: description || null,
        address: address || null,
        approvalNo: approvalNo || null,
        source: 'MANUAL',
      },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return successResponse(transaction, '법인카드 사용내역이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('법인카드 사용내역 등록 중 오류가 발생했습니다.', 500);
  }
}
