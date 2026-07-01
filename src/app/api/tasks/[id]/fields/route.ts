import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// PUT /api/tasks/[id]/fields - 업무의 커스텀 필드 값 upsert (ADMIN/LEADER)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');
    }

    const body = await req.json();
    const { fieldId, value } = body;
    const parsedFieldId = parseInt(fieldId);
    if (isNaN(parsedFieldId)) {
      return errorResponse('유효하지 않은 필드 ID입니다.', 400, 'VALID_400');
    }

    const saved = await prisma.taskFieldValue.upsert({
      where: { taskId_fieldId: { taskId, fieldId: parsedFieldId } },
      create: { taskId, fieldId: parsedFieldId, value: value ?? null },
      update: { value: value ?? null },
    });

    return successResponse(saved, '필드 값이 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('필드 값 저장 중 오류가 발생했습니다.', 500);
  }
}
