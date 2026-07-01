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

// GET /api/projects/[id]/wiki - 프로젝트 위키 목록 (소속 멤버 또는 ADMIN)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 위키를 볼 수 있습니다.', 403, 'AUTH_403');
    }

    const pages = await prisma.wikiPage.findMany({
      where: { projectId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return successResponse(pages, '위키 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('위키 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/projects/[id]/wiki - 위키 문서 작성 (소속 멤버 또는 ADMIN)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 위키를 작성할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, content } = body;

    if (!title?.trim()) {
      return errorResponse('제목을 입력해주세요.', 400, 'VALID_400');
    }
    if (!content?.trim()) {
      return errorResponse('내용을 입력해주세요.', 400, 'VALID_400');
    }

    const page = await prisma.wikiPage.create({
      data: { projectId, title: title.trim(), content: content.trim(), authorId: userId },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(page, '위키 문서가 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('위키 등록 중 오류가 발생했습니다.', 500);
  }
}
