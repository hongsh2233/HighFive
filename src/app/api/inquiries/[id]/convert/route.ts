import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { getProjectStatuses } from '@/lib/task-status';
import { addHistory } from '@/lib/task-history';

// POST /api/inquiries/[id]/convert - 문의를 업무로 전환 (ADMIN/LEADER)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const inquiryId = parseInt(id);
    const body = await req.json();
    const { workerId, projectId } = body;

    if (!workerId) {
      return errorResponse('담당자를 지정해주세요.', 400);
    }

    const inquiry = await prisma.inquiry.findFirst({ where: { id: inquiryId, organizationId } });
    if (!inquiry) {
      return errorResponse('문의를 찾을 수 없습니다.', 404);
    }
    if (inquiry.status === 'CONVERTED') {
      return errorResponse('이미 업무로 전환된 문의입니다.', 400);
    }

    const creatorId = parseInt((session!.user as any).id || '0');
    const resolvedProjectId = projectId ? parseInt(projectId) : null;
    const [initialStatus] = await getProjectStatuses(resolvedProjectId);

    const task = await prisma.task.create({
      data: {
        organizationId,
        title: `[문의] ${inquiry.name} - ${inquiry.type}`,
        registrantId: creatorId,
        workerId: parseInt(workerId),
        projectId: resolvedProjectId,
        status: initialStatus.code,
        notes: `<p>문의자: ${inquiry.name} (${inquiry.contact})</p><p>${inquiry.content}</p>`,
        sourceType: 'INQUIRY',
        sourceId: inquiry.id,
      },
    });

    await addHistory(task.id, creatorId, 'CREATED', '홈페이지 문의에서 전환된 업무');

    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: 'CONVERTED', convertedTaskId: task.id },
    });

    return successResponse({ taskId: task.id }, '업무로 전환되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('업무 전환 중 오류가 발생했습니다.', 500);
  }
}
