import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { notifyStatusChange } from '@/lib/webhook';
import { notifyStatusChanged } from '@/lib/notify';
import { addHistory } from '@/lib/task-history';
import { getProjectStatuses } from '@/lib/task-status';

// PATCH /api/tasks/[id]/status - 업무 상태 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { status } = body;

    // 업무 존재 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return errorResponse('업무를 찾을 수 없습니다.', 404, 'TASK_404');
    }

    const projectStatuses = await getProjectStatuses(task.projectId);
    const newStatusDef = projectStatuses.find((s) => s.code === status);
    if (!status || !newStatusDef) {
      return errorResponse('유효하지 않은 상태입니다.', 400, 'VALID_400');
    }
    const prevStatusDef = projectStatuses.find((s) => s.code === task.status);

    // 상태 변경
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status, updatedAt: new Date() },
      include: {
        registrant: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
      },
    });

    // 시간카운터 사용 업무: 진행중 단계(isProgress)로 들어오면 자동 시작, 벗어나면 자동 종료
    const wasProgress = !!prevStatusDef?.isProgress;
    const isProgress = !!newStatusDef.isProgress;
    if (task.timeCounterEnabled) {
      if (isProgress && !wasProgress) {
        const activeLog = await prisma.timeLog.findFirst({
          where: { taskId, endTime: null },
        });
        if (!activeLog) {
          await prisma.timeLog.create({
            data: { taskId, workerId: task.workerId, startTime: new Date() },
          });
        }
      } else if (wasProgress && !isProgress) {
        const activeLog = await prisma.timeLog.findFirst({
          where: { taskId, endTime: null },
        });
        if (activeLog) {
          const endTime = new Date();
          const durationHours = (endTime.getTime() - activeLog.startTime.getTime()) / (1000 * 60 * 60);
          const rounded = Math.round(durationHours * 100) / 100;
          await prisma.timeLog.update({
            where: { id: activeLog.id },
            data: {
              endTime,
              durationHours: rounded,
              finalHours: rounded + (activeLog.adjustedHours || 0),
            },
          });
        }
      }
    }

    // Webhook 발송 (비동기)
    notifyStatusChange({
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      status: status,
      workerName: updatedTask.worker?.name || '-',
      registrantName: updatedTask.registrant?.name || '-',
      taskUrl: `${process.env.NEXTAUTH_URL}/tasks/${updatedTask.id}`,
    });

    const userId = parseInt((session!.user as any).id || '0');

    // 상태가 실제로 바뀐 경우, 변경한 사람을 제외한 등록자(registrant)/담당자(worker)에게 인앱 알림
    if (task.status !== status) {
      notifyStatusChanged(
        updatedTask.id, updatedTask.title,
        updatedTask.workerId, updatedTask.registrantId,
        newStatusDef.label, userId
      ).catch(() => {});
    }

    await addHistory(updatedTask.id, userId, 'STATUS_CHANGED',
      `${prevStatusDef?.label ?? task.status} → ${newStatusDef.label}`);

    return successResponse(updatedTask, '업무 상태가 변경되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 상태 변경 중 오류가 발생했습니다.', 500);
  }
}
