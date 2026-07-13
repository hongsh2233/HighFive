import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, errorResponse } from '@/lib/utils';
import { addHistory } from '@/lib/task-history';

// GET /api/tasks/[id]/attachments/[attachmentId] - 파일 다운로드
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    const { id, attachmentId } = await params;
    const taskId = parseInt(id);

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: parseInt(attachmentId), taskId, task: { organizationId } },
    });
    if (!attachment) return errorResponse('첨부파일을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    return new NextResponse(new Uint8Array(attachment.data), {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        'Content-Length': String(attachment.size),
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('첨부파일 다운로드 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/tasks/[id]/attachments/[attachmentId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  try {
    const { error, session, organizationId } = await requireAuth();
    if (error) return error;

    const { id, attachmentId } = await params;
    const taskId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: parseInt(attachmentId), taskId, task: { organizationId } },
      include: { task: true },
    });
    if (!attachment) return errorResponse('첨부파일을 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    const canDelete = ['ADMIN', 'LEADER'].includes(role) || attachment.uploadedById === userId;
    if (!canDelete) return errorResponse('첨부파일을 삭제할 권한이 없습니다.', 403, 'AUTH_403');

    await prisma.taskAttachment.delete({ where: { id: attachment.id } });
    await addHistory(taskId, userId, 'NOTE_UPDATED', `첨부파일 "${attachment.filename}" 삭제`);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return errorResponse('첨부파일 삭제 중 오류가 발생했습니다.', 500);
  }
}
