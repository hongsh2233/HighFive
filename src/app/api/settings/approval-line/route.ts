import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/settings/approval-line - 조직 결재선 조회 (인증된 누구나 조회는 가능)
export async function GET() {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    const steps = await prisma.approvalLineStep.findMany({
      where: { organizationId },
      include: { approver: { select: { id: true, name: true } } },
      orderBy: { order: 'asc' },
    });

    return successResponse(steps, '결재선 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('결재선 조회 중 오류가 발생했습니다.', 500);
  }
}

// PUT /api/settings/approval-line - 결재선 전체 교체 (ADMIN만)
export async function PUT(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { steps } = body;
    if (!Array.isArray(steps)) {
      return errorResponse('결재선 단계 목록이 올바르지 않습니다.', 400, 'VALID_400');
    }

    for (const s of steps) {
      if (!s.label?.trim() || !s.approverId) {
        return errorResponse('각 단계의 직책명과 승인자를 입력해주세요.', 400, 'VALID_400');
      }
    }

    await prisma.$transaction([
      prisma.approvalLineStep.deleteMany({ where: { organizationId } }),
      ...(steps.length > 0
        ? [
            prisma.approvalLineStep.createMany({
              data: steps.map((s: any, idx: number) => ({
                organizationId: organizationId!,
                order: idx + 1,
                label: s.label.trim(),
                approverId: parseInt(s.approverId),
                canFinalize: !!s.canFinalize,
              })),
            }),
          ]
        : []),
    ]);

    const updated = await prisma.approvalLineStep.findMany({
      where: { organizationId },
      include: { approver: { select: { id: true, name: true } } },
      orderBy: { order: 'asc' },
    });

    return successResponse(updated, '결재선이 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('결재선 저장 중 오류가 발생했습니다.', 500);
  }
}
