import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { getProjectStatuses } from '@/lib/task-status';
import { addHistory } from '@/lib/task-history';

// POST /api/projects/[id]/meetings/[meetingId]/action-items/[itemId]/convert - 액션아이템을 업무로 전환 (ADMIN/LEADER)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string; itemId: string }> }
) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id, meetingId, itemId } = await params;
    const projectId = parseInt(id);
    const noteId = parseInt(meetingId);
    const actionItemId = parseInt(itemId);

    const item = await prisma.meetingActionItem.findUnique({
      where: { id: actionItemId },
      include: { meetingNote: true },
    });

    if (!item || item.meetingNoteId !== noteId || item.meetingNote.projectId !== projectId) {
      return errorResponse('액션아이템을 찾을 수 없습니다.', 404);
    }
    if (item.status === 'CONVERTED') {
      return errorResponse('이미 업무로 전환된 항목입니다.', 400);
    }

    const body = await req.json();
    const workerId = body.workerId ? parseInt(body.workerId) : item.assigneeId;
    if (!workerId) {
      return errorResponse('담당자를 지정해주세요.', 400);
    }

    const creatorId = parseInt((session!.user as any).id || '0');
    const [initialStatus] = await getProjectStatuses(projectId);
    const meetingDateStr = item.meetingNote.meetingDate
      ? new Date(item.meetingNote.meetingDate).toLocaleDateString('ko-KR')
      : '';

    const task = await prisma.task.create({
      data: {
        organizationId,
        title: item.content,
        registrantId: creatorId,
        workerId,
        projectId,
        targetDate: item.targetDate,
        status: initialStatus.code,
        notes: `<p>${item.meetingNote.title}${meetingDateStr ? ` (${meetingDateStr})` : ''} 미팅 액션아이템</p>`,
        sourceType: 'MEETING',
        sourceId: item.id,
      },
    });

    await addHistory(task.id, creatorId, 'CREATED', '미팅 액션아이템에서 전환된 업무');

    await prisma.meetingActionItem.update({
      where: { id: actionItemId },
      data: { status: 'CONVERTED', taskId: task.id },
    });

    return successResponse({ taskId: task.id }, '업무로 전환되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('업무 전환 중 오류가 발생했습니다.', 500);
  }
}
