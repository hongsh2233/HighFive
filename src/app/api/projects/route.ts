import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

// GET /api/projects
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const where = role === 'ADMIN'
      ? {}
      : { members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(projects);
  } catch (e) {
    console.error(e);
    return errorResponse('조회 실패', 500);
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'MANAGER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const userId = parseInt((session!.user as any).id || '0');
    const { name } = await req.json();

    if (!name?.trim()) {
      return errorResponse('프로젝트 이름을 입력해주세요.', 400);
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        createdBy: userId,
        members: { create: { userId } },
      },
      include: {
        creator: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { tasks: true } },
      },
    });

    return successResponse(project, '프로젝트가 생성되었습니다.', 201);
  } catch (e) {
    console.error(e);
    return errorResponse('생성 실패', 500);
  }
}
