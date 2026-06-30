import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse, parseRmsNo } from '@/lib/utils';
import { sanitize } from '@/lib/sanitize';
import { addHistory } from '@/lib/task-history';

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const workerId = searchParams.get('workerId');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const where: any = {};
    if (status) where.status = status;
    if (workerId) where.workerId = parseInt(workerId);
    if (projectId) where.projectId = parseInt(projectId);

    // MANAGER: 소속 프로젝트 업무만 조회
    if (role === 'MANAGER') {
      const myProjectIds = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const ids = myProjectIds.map((m) => m.projectId);
      where.projectId = projectId ? parseInt(projectId) : { in: ids.length ? ids : [-1] };
    }

    // WORKER: 자신에게 배정된 업무만
    if (role === 'WORKER') {
      where.workerId = userId;
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          planner: { select: { id: true, name: true, email: true } },
          worker: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          timeLogs: true,
          _count: { select: { subTasks: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return successResponse({ data: tasks, total, page, limit }, '업무 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('업무 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userRole = (session?.user as any)?.role;
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return errorResponse('업무를 생성할 권한이 없습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, workerId, plannerId, targetDate, projectId, labels, subTasks, isGroup, parentTaskId } = body;
    const notes = sanitize(body.notes || '');
    const labelsStr: string | null = Array.isArray(labels) && labels.length > 0 ? labels.join(',') : null;

    if (!title || !workerId || !plannerId) {
      return errorResponse('필수 항목이 누락되었습니다.', 400, 'VALID_400');
    }

    const { cleanTitle, rmsNo } = parseRmsNo(title);
    const creatorId = parseInt((session!.user as any).id || '0');

    // 기존 그룹 업무에 하위 업무를 1건 추가하는 경우
    if (parentTaskId) {
      const parent = await prisma.task.findUnique({ where: { id: parseInt(parentTaskId) } });
      if (!parent) {
        return errorResponse('상위 그룹 업무를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');
      }

      const subTask = await prisma.task.create({
        data: {
          title: cleanTitle,
          rmsNo,
          workerId: parseInt(workerId),
          plannerId: parseInt(plannerId),
          targetDate: targetDate ? new Date(targetDate) : null,
          notes,
          labels: labelsStr,
          status: 'ASSIGNED',
          projectId: projectId ? parseInt(projectId) : null,
          parentTaskId: parent.id,
        },
        include: {
          planner: { select: { id: true, name: true, email: true } },
          worker: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      });

      await addHistory(subTask.id, creatorId, 'CREATED', `그룹 업무 "${parent.title}"의 하위 업무로 추가`);

      return successResponse(subTask, '하위 업무가 추가되었습니다.', 201);
    }

    const isGroupReq = isGroup === true;

    const task = await prisma.task.create({
      data: {
        title: cleanTitle,
        rmsNo,
        workerId: parseInt(workerId),
        plannerId: parseInt(plannerId),
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: isGroupReq ? null : notes,
        labels: labelsStr,
        isGroup: isGroupReq,
        status: 'ASSIGNED',
        projectId: projectId ? parseInt(projectId) : null,
      },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await addHistory(task.id, creatorId, 'CREATED', `담당자: ${task.worker?.name}`);

    if (isGroupReq && Array.isArray(subTasks) && subTasks.length > 0) {
      for (const sub of subTasks) {
        if (!sub?.title || !sub?.workerId) continue;
        const { cleanTitle: subTitle, rmsNo: subRmsNo } = parseRmsNo(sub.title);
        const subTask = await prisma.task.create({
          data: {
            title: subTitle,
            rmsNo: subRmsNo,
            workerId: parseInt(sub.workerId),
            plannerId: parseInt(plannerId),
            targetDate: sub.targetDate ? new Date(sub.targetDate) : null,
            status: 'ASSIGNED',
            projectId: projectId ? parseInt(projectId) : null,
            labels: labelsStr,
            parentTaskId: task.id,
          },
        });
        await addHistory(subTask.id, creatorId, 'CREATED', `그룹 업무 "${task.title}"의 하위 업무로 생성`);
      }
    }

    const result = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        worker: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        subTasks: {
          include: { worker: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    return successResponse(result, '업무가 생성되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('업무 생성 중 오류가 발생했습니다.', 500);
  }
}
