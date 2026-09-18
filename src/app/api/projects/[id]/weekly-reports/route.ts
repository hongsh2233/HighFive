import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, hasCapability, successResponse, errorResponse } from '@/lib/utils';

async function checkAccess(projectId: number, userId: number, role: string) {
  if (role === 'ADMIN') return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

// GET /api/projects/[id]/weekly-reports - 프로젝트 주간보고 목록 (소속 멤버 또는 ADMIN)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 주간보고를 볼 수 있습니다.', 403, 'AUTH_403');
    }

    const reports = await prisma.weeklyReport.findMany({
      where: { projectId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { periodStart: 'desc' },
    });

    return successResponse(reports, '주간보고 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('주간보고 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/projects/[id]/weekly-reports - 주간보고 작성 (ADMIN/LEADER 또는 지정 권한 사용자)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (role !== 'ADMIN' && role !== 'LEADER') {
      if (!(await hasCapability(userId, 'WEEKLY_REPORT'))) {
        return errorResponse('주간보고 작성 권한이 없습니다.', 403, 'AUTH_403');
      }
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 주간보고를 작성할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { periodStart, periodEnd, achievements, nextPlan, issues, summary } = body;

    if (!periodStart || !periodEnd) {
      return errorResponse('보고 기간을 입력해주세요.', 400, 'VALID_400');
    }

    const report = await prisma.weeklyReport.create({
      data: {
        projectId,
        authorId: userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        achievements: achievements ?? [],
        nextPlan: nextPlan ?? [],
        issues: issues ?? [],
        summary: summary?.trim() || null,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(report, '주간보고가 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('주간보고 등록 중 오류가 발생했습니다.', 500);
  }
}
