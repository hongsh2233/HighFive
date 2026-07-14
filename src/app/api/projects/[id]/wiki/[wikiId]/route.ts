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

// PATCH /api/projects/[id]/wiki/[wikiId] - 위키 문서 수정 (소속 멤버 또는 ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; wikiId: string }> }) {
  try {
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const { id, wikiId } = await params;
    const projectId = parseInt(id);
    const pageId = parseInt(wikiId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 위키를 수정할 수 있습니다.', 403, 'AUTH_403');
    }

    const page = await prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (!page || page.projectId !== projectId) {
      return errorResponse('위키 문서를 찾을 수 없습니다.', 404);
    }

    const body = await req.json();
    const { title, content } = body;

    const updated = await prisma.wikiPage.update({
      where: { id: pageId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/projects/[id]/wiki/[wikiId] - 위키 문서 삭제 (작성자 본인 또는 ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; wikiId: string }> }) {
  try {
    const { session, organizationId, error } = await requireAuth();
    if (error) return error;

    const { id, wikiId } = await params;
    const projectId = parseInt(id);
    const pageId = parseInt(wikiId);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404);

    const page = await prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (!page || page.projectId !== projectId) {
      return errorResponse('위키 문서를 찾을 수 없습니다.', 404);
    }

    if (page.authorId !== userId && role !== 'ADMIN') {
      return errorResponse('작성자 본인 또는 관리자만 삭제할 수 있습니다.', 403, 'AUTH_403');
    }

    await prisma.wikiPage.delete({ where: { id: pageId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
