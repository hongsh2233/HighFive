import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, errorResponse } from '@/lib/utils';
import { createAuditLog } from '@/lib/audit';

// GET /api/settings/organization/backup — 조직 전체 데이터 JSON 백업 다운로드 (ADMIN 전용)
export async function GET() {
  try {
    const { error, session, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const orgId = organizationId!;
    const userId = parseInt((session!.user as any).id || '0');

    const [
      organization,
      users,
      projects,
      projectMembers,
      tasks,
      timeLogs,
      taskComments,
      taskHistories,
      taskAttachments,
      infoItems,
      announcements,
      requests,
      wikiPages,
      stickyNotes,
      userPages,
      integrations,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true, email: true, name: true, role: true, isActive: true, leaveDate: true,
          affiliation: true, managerId: true, totpEnabled: true, createdAt: true, lastLoginAt: true,
        },
      }),
      prisma.project.findMany({ where: { organizationId: orgId } }),
      prisma.projectMember.findMany({ where: { project: { organizationId: orgId } } }),
      prisma.task.findMany({ where: { organizationId: orgId } }),
      prisma.timeLog.findMany({ where: { task: { organizationId: orgId } } }),
      prisma.taskComment.findMany({ where: { task: { organizationId: orgId } } }),
      prisma.taskHistory.findMany({ where: { task: { organizationId: orgId } } }),
      prisma.taskAttachment.findMany({
        where: { task: { organizationId: orgId } },
        select: { id: true, taskId: true, filename: true, mimeType: true, size: true, uploadedById: true, createdAt: true },
      }),
      prisma.infoItem.findMany({ where: { organizationId: orgId } }),
      prisma.announcement.findMany({ where: { organizationId: orgId } }),
      prisma.request.findMany({ where: { organizationId: orgId } }),
      prisma.wikiPage.findMany({ where: { project: { organizationId: orgId } } }),
      prisma.stickyNote.findMany({ where: { organizationId: orgId } }),
      prisma.userPage.findMany({ where: { organizationId: orgId } }),
      prisma.integration.findMany({
        where: { organizationId: orgId },
        select: { id: true, channel: true, isEnabled: true, updatedAt: true },
      }),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: session!.user?.email,
      formatVersion: 1,
      organization,
      users,
      projects,
      projectMembers,
      tasks,
      timeLogs,
      taskComments,
      taskHistories,
      taskAttachments,
      infoItems,
      announcements,
      requests,
      wikiPages,
      stickyNotes,
      userPages,
      integrations,
      note: '첨부파일(TaskAttachment)의 실제 파일 바이너리는 용량 문제로 이 백업에 포함되지 않으며 메타데이터만 포함됩니다.',
    };

    await createAuditLog({
      organizationId: orgId,
      userId,
      userEmail: session!.user?.email,
      action: 'DATA_EXPORTED',
      detail: { tables: Object.keys(backup).length },
    });

    const filename = `highfive-backup-${organization?.slug || orgId}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('데이터 백업 생성 중 오류가 발생했습니다.', 500);
  }
}
