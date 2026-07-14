import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { ensureProjectsSchema } from '@/lib/db-init';

// GET /api/projects/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureProjectsSchema();
    const { organizationId, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { id: parseInt(id), organizationId },
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
    await ensureProjectsSchema();
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const { id } = await params;
    const projectId = parseInt(id);

    const existing = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!existing) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);

    const body = await req.json();
    const { name, status, projectManagerName, projectLeadName } = body;

    // 부분 업데이트: 전달된 필드만 SET
    const setClauses: string[] = ['"updatedAt"=NOW()'];
    const values: (string | number | null)[] = [];
    let idx = 1;

    if (name !== undefined) { setClauses.push(`name=$${idx++}`); values.push(name.trim()); }
    if (status !== undefined) { setClauses.push(`status=$${idx++}`); values.push(status); }
    if (projectManagerName !== undefined) { setClauses.push(`"projectManagerName"=$${idx++}`); values.push(projectManagerName?.trim() || null); }
    if (projectLeadName !== undefined) { setClauses.push(`"projectLeadName"=$${idx++}`); values.push(projectLeadName?.trim() || null); }

    values.push(projectId);
    await prisma.$executeRawUnsafe(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id=$${idx}`,
      ...values,
    );

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { tasks: true } },
      },
    });

    return successResponse(project, '수정되었습니다.');
  } catch (e: any) {
    console.error('[PATCH /api/projects/:id]', e);
    return errorResponse('수정 실패', 500);
  }
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureProjectsSchema();
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (role !== 'ADMIN') {
      return errorResponse('최고관리자만 삭제할 수 있습니다.', 403);
    }

    const { id } = await params;
    const existing = await prisma.project.findFirst({ where: { id: parseInt(id), organizationId } });
    if (!existing) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);

    await prisma.project.delete({ where: { id: parseInt(id) } });

    return successResponse(null, '삭제되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('삭제 실패', 500);
  }
}
