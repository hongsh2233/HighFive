import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, requireSuperAdmin } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const orgId = parseInt(id);

    await prisma.$transaction([
      prisma.userNotification.deleteMany({ where: { organizationId: orgId } }),
      prisma.taskComment.deleteMany({ where: { task: { organizationId: orgId } } }),
      prisma.taskHistory.deleteMany({ where: { task: { organizationId: orgId } } }),
      prisma.timeLog.deleteMany({ where: { task: { organizationId: orgId } } }),
      prisma.taskFieldValue.deleteMany({ where: { task: { organizationId: orgId } } }),
      prisma.task.deleteMany({ where: { organizationId: orgId } }),
      prisma.projectMember.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.wikiPage.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.projectStatus.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.projectField.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.project.deleteMany({ where: { organizationId: orgId } }),
      prisma.infoItem.deleteMany({ where: { organizationId: orgId } }),
      prisma.announcement.deleteMany({ where: { organizationId: orgId } }),
      prisma.request.deleteMany({ where: { organizationId: orgId } }),
      prisma.stickyNote.deleteMany({ where: { organizationId: orgId } }),
      prisma.userPage.deleteMany({ where: { organizationId: orgId } }),
      prisma.integration.deleteMany({ where: { organizationId: orgId } }),
      prisma.template.deleteMany({ where: { organizationId: orgId } }),
      prisma.inviteToken.deleteMany({ where: { organizationId: orgId } }),
      prisma.user.deleteMany({ where: { organizationId: orgId } }),
      prisma.organization.delete({ where: { id: orgId } }),
    ]);

    return successResponse(null, '조직이 삭제되었습니다.');
  } catch {
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const orgId = parseInt(id);
    const body = await req.json();

    const { plan, isActive, bizNo, phone, ceoName } = body;

    const data: { plan?: string; isActive?: boolean; bizNo?: string | null; phone?: string | null; ceoName?: string | null } = {};
    if (plan !== undefined) data.plan = plan;
    if (isActive !== undefined) data.isActive = isActive;
    if (bizNo !== undefined) data.bizNo = bizNo || null;
    if (phone !== undefined) data.phone = phone || null;
    if (ceoName !== undefined) data.ceoName = ceoName || null;

    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    return successResponse(org);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
