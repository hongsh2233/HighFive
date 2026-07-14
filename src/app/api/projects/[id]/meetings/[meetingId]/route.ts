import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

async function checkAccess(projectId: number, userId: number, role: string) {
  if (role === 'ADMIN') return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

// PATCH /api/projects/[id]/meetings/[meetingId] - 회의록 수정 (소속 멤버 또는 ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, meetingId } = await params;
    const projectId = parseInt(id);
    const noteId = parseInt(meetingId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 회의록을 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const note = await prisma.meetingNote.findUnique({ where: { id: noteId } });
    if (!note || note.projectId !== projectId) {
      return errorResponse('회의록을 찾을 수 없습니다.', 404);
    }

    const body = await req.json();
    const { title, content, attendees, meetingDate } = body;

    const updated = await prisma.meetingNote.update({
      where: { id: noteId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(attendees !== undefined && { attendees: attendees?.trim() || null }),
        ...(meetingDate !== undefined && { meetingDate: meetingDate ? new Date(meetingDate) : null }),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/projects/[id]/meetings/[meetingId] - 회의록 삭제 (작성자 본인 또는 ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, meetingId } = await params;
    const projectId = parseInt(id);
    const noteId = parseInt(meetingId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const note = await prisma.meetingNote.findUnique({ where: { id: noteId } });
    if (!note || note.projectId !== projectId) {
      return errorResponse('회의록을 찾을 수 없습니다.', 404);
    }

    if (note.authorId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    await prisma.meetingNote.delete({ where: { id: noteId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
