import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

async function checkAccess(projectId: number, userId: number, role: string) {
  if (role === 'ADMIN') return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

// GET /api/projects/[id]/weekly-reports/[reportId] - 주간보고 단건 조회 (소속 멤버 또는 ADMIN)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, reportId } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 주간보고를 볼 수 있습니다.', 403, 'AUTH_403');
    }

    const report = await prisma.weeklyReport.findUnique({
      where: { id: parseInt(reportId) },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!report || report.projectId !== projectId) {
      return errorResponse('주간보고를 찾을 수 없습니다.', 404);
    }

    return successResponse(report, '주간보고 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('주간보고 조회 중 오류가 발생했습니다.', 500);
  }
}

// PATCH /api/projects/[id]/weekly-reports/[reportId] - 주간보고 수정 (작성자 본인 또는 ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, reportId } = await params;
    const projectId = parseInt(id);
    const noteId = parseInt(reportId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const report = await prisma.weeklyReport.findUnique({ where: { id: noteId } });
    if (!report || report.projectId !== projectId) {
      return errorResponse('주간보고를 찾을 수 없습니다.', 404);
    }
    if (report.authorId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { periodStart, periodEnd, achievements, nextPlan, issues, summary } = body;

    const updated = await prisma.weeklyReport.update({
      where: { id: noteId },
      data: {
        ...(periodStart !== undefined && { periodStart: new Date(periodStart) }),
        ...(periodEnd !== undefined && { periodEnd: new Date(periodEnd) }),
        ...(achievements !== undefined && { achievements }),
        ...(nextPlan !== undefined && { nextPlan }),
        ...(issues !== undefined && { issues }),
        ...(summary !== undefined && { summary: summary?.trim() || null }),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/projects/[id]/weekly-reports/[reportId] - 주간보고 삭제 (작성자 본인 또는 ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id, reportId } = await params;
    const projectId = parseInt(id);
    const noteId = parseInt(reportId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const report = await prisma.weeklyReport.findUnique({ where: { id: noteId } });
    if (!report || report.projectId !== projectId) {
      return errorResponse('주간보고를 찾을 수 없습니다.', 404);
    }
    if (report.authorId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    await prisma.weeklyReport.delete({ where: { id: noteId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
