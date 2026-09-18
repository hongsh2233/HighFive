import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

async function checkAccess(projectId: number, userId: number, role: string) {
  if (role === 'ADMIN' || role === 'LEADER') return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

// GET /api/projects/[id]/milestones - 프로젝트 마일스톤 목록 (소속 멤버 또는 ADMIN/LEADER)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 조회할 수 있습니다.', 403, 'AUTH_403');
    }

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return successResponse(milestones, '마일스톤 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('마일스톤 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/projects/[id]/milestones - 마일스톤 등록 (ADMIN/LEADER)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('마일스톤은 ADMIN/매니저만 등록할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, dueDate } = body;
    if (!title?.trim()) return errorResponse('제목을 입력해주세요.', 400, 'VALID_400');

    const count = await prisma.projectMilestone.count({ where: { projectId } });
    const milestone = await prisma.projectMilestone.create({
      data: { projectId, title: title.trim(), dueDate: dueDate ? new Date(dueDate) : null, order: count },
    });

    return successResponse(milestone, '마일스톤이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('마일스톤 등록 중 오류가 발생했습니다.', 500);
  }
}
