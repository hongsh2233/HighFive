import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, successResponse, errorResponse } from '@/lib/utils';
import { DEFAULT_STATUSES } from '@/lib/task-status';

const MAX_STATUSES = 15;

function slugify(label: string, index: number, used: Set<string>) {
  let base = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9가-힣]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) base = `STATUS_${index}`;
  let code = base;
  let n = 1;
  while (used.has(code)) {
    code = `${base}_${n++}`;
  }
  used.add(code);
  return code;
}

// GET /api/projects/[id]/statuses - 프로젝트 상태 단계 조회 (없으면 기본 5단계)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);

    const rows = await prisma.projectStatus.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    if (rows.length > 0) {
      return successResponse(rows, '상태 단계 조회 완료');
    }

    const defaults = DEFAULT_STATUSES.map((s, i) => ({ id: null, projectId, ...s, isCustom: false, order: i }));
    return successResponse(defaults, '상태 단계 조회 완료(기본값)');
  } catch (err) {
    console.error(err);
    return errorResponse('상태 단계 조회 중 오류가 발생했습니다.', 500);
  }
}

// PUT /api/projects/[id]/statuses - 프로젝트 상태 단계 전체 저장 (ADMIN/LEADER)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);

    const body = await req.json();
    const { statuses } = body;

    if (!Array.isArray(statuses) || statuses.length === 0) {
      return errorResponse('최소 1개 이상의 상태 단계가 필요합니다.', 400, 'VALID_400');
    }
    if (statuses.length > MAX_STATUSES) {
      return errorResponse(`상태 단계는 최대 ${MAX_STATUSES}개까지 만들 수 있습니다.`, 400, 'VALID_400');
    }
    if (statuses.some((s: any) => !s?.label?.trim())) {
      return errorResponse('모든 단계에 이름을 입력해주세요.', 400, 'VALID_400');
    }

    const used = new Set<string>();
    const data = statuses.map((s: any, index: number) => {
      let code = s.code?.trim() ? s.code.trim().toUpperCase() : '';
      if (!code || used.has(code)) {
        code = slugify(s.label, index, used);
      } else {
        used.add(code);
      }
      return {
        projectId,
        code,
        label: s.label.trim(),
        color: s.color?.trim() || null,
        order: index,
        isProgress: !!s.isProgress,
        isDone: !!s.isDone,
      };
    });

    await prisma.$transaction([
      prisma.projectStatus.deleteMany({ where: { projectId } }),
      prisma.projectStatus.createMany({ data }),
    ]);

    const saved = await prisma.projectStatus.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
    return successResponse(saved, '상태 단계가 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('상태 단계 저장 중 오류가 발생했습니다.', 500);
  }
}
