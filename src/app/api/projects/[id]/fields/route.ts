import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, successResponse, errorResponse } from '@/lib/utils';

const MAX_FIELDS = 10;
const VALID_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX'];

// GET /api/projects/[id]/fields - 프로젝트 커스텀 필드 정의 조회
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);

    const fields = await prisma.projectField.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return successResponse(fields, '커스텀 필드 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('커스텀 필드 조회 중 오류가 발생했습니다.', 500);
  }
}

// PUT /api/projects/[id]/fields - 프로젝트 커스텀 필드 정의 전체 저장 (ADMIN/LEADER)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);

    const body = await req.json();
    const { fields } = body;

    if (!Array.isArray(fields)) {
      return errorResponse('필드 목록 형식이 올바르지 않습니다.', 400, 'VALID_400');
    }
    if (fields.length > MAX_FIELDS) {
      return errorResponse(`커스텀 필드는 최대 ${MAX_FIELDS}개까지 만들 수 있습니다.`, 400, 'VALID_400');
    }
    if (fields.some((f: any) => !f?.name?.trim())) {
      return errorResponse('모든 필드에 이름을 입력해주세요.', 400, 'VALID_400');
    }
    if (fields.some((f: any) => !VALID_TYPES.includes(f?.type))) {
      return errorResponse('올바르지 않은 필드 타입이 있습니다.', 400, 'VALID_400');
    }

    const data = fields.map((f: any, index: number) => ({
      projectId,
      name: f.name.trim(),
      type: f.type,
      options: f.type === 'SELECT' ? (f.options || '').trim() || null : null,
      order: index,
    }));

    await prisma.$transaction([
      prisma.projectField.deleteMany({ where: { projectId } }),
      prisma.projectField.createMany({ data }),
    ]);

    const saved = await prisma.projectField.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
    return successResponse(saved, '커스텀 필드가 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('커스텀 필드 저장 중 오류가 발생했습니다.', 500);
  }
}
