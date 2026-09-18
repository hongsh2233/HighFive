import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/projects/[id]/milestones/[milestoneId] - 수정(완료 토글 등, ADMIN/LEADER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, milestoneId } = await params;
    const projectId = parseInt(id);
    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('마일스톤은 ADMIN/매니저만 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const milestone = await prisma.projectMilestone.findFirst({ where: { id: parseInt(milestoneId), projectId } });
    if (!milestone) return errorResponse('마일스톤을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    const body = await req.json();
    const { title, dueDate, isDone, order } = body;

    const updated = await prisma.projectMilestone.update({
      where: { id: milestone.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isDone !== undefined && { isDone: !!isDone }),
        ...(order !== undefined && { order: parseInt(order) }),
      },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/projects/[id]/milestones/[milestoneId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, milestoneId } = await params;
    const projectId = parseInt(id);
    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('마일스톤은 ADMIN/매니저만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    const milestone = await prisma.projectMilestone.findFirst({ where: { id: parseInt(milestoneId), projectId } });
    if (!milestone) return errorResponse('마일스톤을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    await prisma.projectMilestone.delete({ where: { id: milestone.id } });
    return successResponse({ id: milestone.id }, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
