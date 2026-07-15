import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { getProjectStatuses } from '@/lib/task-status';
import { wouldCreateCycle } from '@/lib/task-dependency';

// GET /api/tasks/[id]/dependencies - 선행 업무 목록
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);

    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) return errorResponse('업무를 찾을 수 없습니다.', 404);

    const deps = await prisma.taskDependency.findMany({
      where: { taskId },
      include: { blockingTask: { select: { id: true, title: true, status: true, projectId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const list = await Promise.all(deps.map(async (d) => {
      const statuses = await getProjectStatuses(d.blockingTask.projectId);
      const isDone = statuses.find((s) => s.code === d.blockingTask.status)?.isDone ?? false;
      return { id: d.blockingTask.id, title: d.blockingTask.title, status: d.blockingTask.status, isDone };
    }));

    return successResponse(list);
  } catch (err) {
    console.error(err);
    return errorResponse('조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/tasks/[id]/dependencies - 선행 업무 추가
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    const body = await req.json();
    const blockingTaskId = parseInt(body.blockingTaskId);
    if (isNaN(blockingTaskId)) return errorResponse('유효하지 않은 요청입니다.', 400, 'VALID_400');
    if (blockingTaskId === taskId) return errorResponse('같은 업무를 선행 업무로 지정할 수 없습니다.', 400, 'VALID_400');

    const [task, blockingTask] = await Promise.all([
      prisma.task.findFirst({ where: { id: taskId, organizationId } }),
      prisma.task.findFirst({ where: { id: blockingTaskId, organizationId } }),
    ]);
    if (!task || !blockingTask) return errorResponse('업무를 찾을 수 없습니다.', 404);

    if (await wouldCreateCycle(taskId, blockingTaskId)) {
      return errorResponse('순환 의존관계는 등록할 수 없습니다.', 400, 'CYCLE_400');
    }

    await prisma.taskDependency.upsert({
      where: { taskId_blockingTaskId: { taskId, blockingTaskId } },
      update: {},
      create: { taskId, blockingTaskId },
    });

    return successResponse(null, '선행 업무가 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('등록 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/tasks/[id]/dependencies - 선행 업무 제거
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { organizationId, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    const body = await req.json();
    const blockingTaskId = parseInt(body.blockingTaskId);
    if (isNaN(blockingTaskId)) return errorResponse('유효하지 않은 요청입니다.', 400, 'VALID_400');

    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) return errorResponse('업무를 찾을 수 없습니다.', 404);

    await prisma.taskDependency.deleteMany({ where: { taskId, blockingTaskId } });

    return successResponse(null, '선행 업무가 제거되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('제거 중 오류가 발생했습니다.', 500);
  }
}
