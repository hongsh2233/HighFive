import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/recurring-tasks/[id] - 활성화/비활성화, 기본 필드 수정 (ADMIN/LEADER, 생성자 또는 ADMIN만)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const ruleId = parseInt(id);
    const rule = await prisma.recurringTaskRule.findFirst({ where: { id: ruleId, organizationId } });
    if (!rule) return errorResponse('반복 업무 규칙을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');
    if (role !== 'ADMIN' && rule.createdById !== userId) {
      return errorResponse('본인이 등록한 규칙만 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, notes, isActive, targetDaysOffset } = body;

    const updated = await prisma.recurringTaskRule.update({
      where: { id: ruleId },
      data: {
        ...(title !== undefined && { title }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(targetDaysOffset !== undefined && { targetDaysOffset: parseInt(targetDaysOffset) }),
      },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/recurring-tasks/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const ruleId = parseInt(id);
    const rule = await prisma.recurringTaskRule.findFirst({ where: { id: ruleId, organizationId } });
    if (!rule) return errorResponse('반복 업무 규칙을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');
    if (role !== 'ADMIN' && rule.createdById !== userId) {
      return errorResponse('본인이 등록한 규칙만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    await prisma.recurringTaskRule.delete({ where: { id: ruleId } });
    return successResponse({ id: ruleId }, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
