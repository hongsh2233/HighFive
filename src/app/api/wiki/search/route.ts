import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// GET /api/wiki/search?q=... - 내가 소속된 프로젝트(ADMIN은 전체)의 위키 문서 검색
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;
    const q = new URL(req.url).searchParams.get('q')?.trim() || '';

    let accessibleProjectIds: number[] | null = null;
    if (role !== 'ADMIN') {
      const memberships = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const ids: number[] = memberships.map((m: { projectId: number }) => m.projectId);
      if (ids.length === 0) {
        return successResponse([], '검색 결과 없음');
      }
      accessibleProjectIds = ids;
    }

    const where: any = {
      ...(accessibleProjectIds !== null && { projectId: { in: accessibleProjectIds } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const pages = await prisma.wikiPage.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const results = pages.map((p) => ({
      id: p.id,
      title: p.title,
      snippet: p.content.length > 120 ? `${p.content.slice(0, 120)}...` : p.content,
      projectId: p.project.id,
      projectName: p.project.name,
      updatedAt: p.updatedAt,
    }));

    return successResponse(results, '검색 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('위키 검색 중 오류가 발생했습니다.', 500);
  }
}
