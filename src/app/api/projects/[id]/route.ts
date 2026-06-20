import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// GET /api/projects/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);

    return successResponse(project);
  } catch (e) {
    console.error(e);
    return errorResponse('조회 실패', 500);
  }
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'MANAGER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { name, status, projectManagerName, projectLeadName } = body;

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(status !== undefined && { status }),
        ...(projectManagerName !== undefined && { projectManagerName: projectManagerName?.trim() || null }),
        ...(projectLeadName !== undefined && { projectLeadName: projectLeadName?.trim() || null }),
      },
      include: {
        creator: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { tasks: true } },
      },
    });

    return successResponse(project, '수정되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('수정 실패', 500);
  }
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (role !== 'ADMIN') {
      return errorResponse('최고관리자만 삭제할 수 있습니다.', 403);
    }

    const { id } = await params;
    await prisma.project.delete({ where: { id: parseInt(id) } });

    return successResponse(null, '삭제되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('삭제 실패', 500);
  }
}
