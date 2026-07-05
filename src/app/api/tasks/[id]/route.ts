import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse, parseRmsNo } from '@/lib/utils';
import { sanitize } from '@/lib/sanitize';
import { addHistory } from '@/lib/task-history';
import { notifyWorkerChange } from '@/lib/notify';
import { isValidStatus } from '@/lib/task-status';

// GET /api/tasks/[id] - 업무 상세 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        registrant: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
        timeLogs: { orderBy: { createdAt: 'desc' } },
        fieldValues: true,
      },
    });

    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    return successResponse(task, '업무 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 조회 중 오류가 발생했습니다.', 500);
  }
}

// PATCH /api/tasks/[id] - 업무 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userRole = (session?.user as any)?.role;
    if (!['ADMIN', 'LEADER'].includes(userRole)) {
      return errorResponse('업무를 수정할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { title, targetDate, notes, status, workerId: newWorkerId, externalLink } = body;

    // 담당자/제목 변경 감지를 위해 수정 전 상태 조회
    const prevTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { worker: { select: { name: true } } },
    });
    if (!prevTask) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    // RMS 번호 파싱 (title이 있으면)
    let updateData: any = {};
    if (title) {
      const { cleanTitle, rmsNo } = parseRmsNo(title);
      updateData.title = cleanTitle;
      updateData.rmsNo = rmsNo;
    }
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (notes !== undefined) updateData.notes = sanitize(notes || '');
    if (externalLink !== undefined) updateData.externalLink = externalLink || null;
    if (status !== undefined) {
      if (!(await isValidStatus(prevTask.projectId, status))) {
        return errorResponse('유효하지 않은 상태값입니다.', 400, 'VALID_400');
      }
      updateData.status = status;
    }
    updateData.updatedAt = new Date();

    if (newWorkerId !== undefined) updateData.workerId = parseInt(newWorkerId);

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        registrant: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
      },
    });

    const editorId = parseInt((session!.user as any).id || '0');
    if (newWorkerId !== undefined && prevTask.workerId !== parseInt(newWorkerId)) {
      await addHistory(taskId, editorId, 'WORKER_CHANGED',
        `${prevTask.worker?.name} → ${task.worker?.name}`);
      const taskUrl = `${process.env.NEXTAUTH_URL}/tasks/${taskId}`;
      notifyWorkerChange(taskId, task.title, task.workerId, task.worker?.name || '', task.registrantId, task.registrant?.name || '', taskUrl).catch(() => {});
    }
    if (title && prevTask.title !== updateData.title) {
      await addHistory(taskId, editorId, 'TITLE_CHANGED', `${prevTask.title} → ${task.title}`);
    }
    if (targetDate !== undefined) {
      const prevDate = prevTask.targetDate ? prevTask.targetDate.toISOString().slice(0, 10) : null;
      const newDate = task.targetDate ? task.targetDate.toISOString().slice(0, 10) : null;
      if (prevDate !== newDate) {
        await addHistory(taskId, editorId, 'TARGET_DATE_CHANGED', `${prevDate ?? '없음'} → ${newDate ?? '없음'}`);
      }
    }
    if (notes !== undefined) {
      await addHistory(taskId, editorId, 'NOTE_UPDATED');
    }

    return successResponse(task, '업무가 수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/tasks/[id] - 업무 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userRole = (session?.user as any)?.role;
    if (!['ADMIN', 'LEADER'].includes(userRole)) {
      return errorResponse('업무를 삭제할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    // 관련 timelog 삭제
    await prisma.timeLog.deleteMany({
      where: { taskId },
    });

    // 업무 삭제
    await prisma.task.delete({
      where: { id: taskId },
    });

    return successResponse({ message: '업무가 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    return errorResponse('업무 삭제 중 오류가 발생했습니다.', 500);
  }
}
