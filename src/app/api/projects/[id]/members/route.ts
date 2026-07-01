import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { ensureProjectsSchema } from '@/lib/db-init';

// POST /api/projects/[id]/members - 멤버 추가
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureProjectsSchema();
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const { id } = await params;
    const projectId = parseInt(id);
    const { userId } = await req.json();

    if (!userId) return errorResponse('userId가 필요합니다.', 400);

    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: parseInt(userId) } },
      update: {},
      create: { projectId, userId: parseInt(userId) },
    });

    // Update user's projectIds by returning updated project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } } },
    });

    return successResponse(project, '멤버가 추가되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('멤버 추가 실패', 500);
  }
}

// DELETE /api/projects/[id]/members - 멤버 제거
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const { id } = await params;
    const projectId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const userId = parseInt(searchParams.get('userId') || '0');

    if (!userId) return errorResponse('userId가 필요합니다.', 400);

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    return successResponse(null, '멤버가 제거되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('멤버 제거 실패', 500);
  }
}
