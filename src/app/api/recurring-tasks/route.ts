import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { computeNextRunAt, FREQUENCIES } from '@/lib/recurring-tasks';

// GET /api/recurring-tasks - 반복 업무 규칙 목록 (ADMIN/LEADER)
export async function GET() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const rules = await prisma.recurringTaskRule.findMany({
      where: { organizationId },
      include: {
        worker: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(rules, '반복 업무 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('반복 업무 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/recurring-tasks - 반복 업무 규칙 생성 (ADMIN/LEADER)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const body = await req.json();
    const { title, notes, workerId, projectId, frequency, config, targetDaysOffset, startAt } = body;

    if (!title || !workerId || !frequency) {
      return errorResponse('필수 항목이 누락되었습니다.', 400, 'VALID_400');
    }
    if (!FREQUENCIES.includes(frequency)) {
      return errorResponse('유효하지 않은 반복 주기입니다.', 400, 'VALID_400');
    }

    const worker = await prisma.user.findFirst({ where: { id: parseInt(workerId), organizationId } });
    if (!worker) {
      return errorResponse('유효하지 않은 담당자입니다.', 400, 'VALID_400');
    }
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: parseInt(projectId), organizationId } });
      if (!project) return errorResponse('유효하지 않은 프로젝트입니다.', 400, 'VALID_400');
    }

    const creatorId = parseInt((session!.user as any).id || '0');
    const firstRunAt = startAt ? new Date(startAt) : computeNextRunAt(new Date(), frequency, config);

    const rule = await prisma.recurringTaskRule.create({
      data: {
        organizationId: organizationId!,
        projectId: projectId ? parseInt(projectId) : null,
        title: title.trim(),
        notes: notes?.trim() || null,
        workerId: parseInt(workerId),
        createdById: creatorId,
        frequency,
        config: config ?? undefined,
        targetDaysOffset: targetDaysOffset ? parseInt(targetDaysOffset) : 0,
        nextRunAt: firstRunAt,
      },
      include: { worker: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    });

    return successResponse(rule, '반복 업무 규칙이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('반복 업무 규칙 등록 중 오류가 발생했습니다.', 500);
  }
}
