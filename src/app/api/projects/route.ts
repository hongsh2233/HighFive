import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { ensureProjectsSchema } from '@/lib/db-init';

const projectInclude = {
  creator: { select: { id: true, name: true } },
  members: { include: { user: { select: { id: true, name: true, role: true } } } },
  _count: { select: { tasks: true } },
} as const;

// GET /api/projects
export async function GET() {
  try {
    await ensureProjectsSchema();
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const baseWhere = role === 'ADMIN'
      ? { organizationId }
      : {
          organizationId,
          OR: [
            { members: { some: { userId } } },
            { tasks: { some: { OR: [{ workerId: userId }, { registrantId: userId }] } } },
          ],
        };

    const projects = await prisma.project.findMany({
      where: baseWhere,
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(projects);
  } catch (e: any) {
    console.error('[GET /api/projects]', e);
    return errorResponse('조회 실패', 500);
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    await ensureProjectsSchema();
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'LEADER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const userId = parseInt((session!.user as any).id || '0');
    const { name, projectManagerName, projectLeadName } = await req.json();

    if (!name?.trim()) {
      return errorResponse('프로젝트 이름을 입력해주세요.', 400);
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        createdBy: userId,
        organizationId,
        projectManagerName: projectManagerName?.trim() || null,
        projectLeadName: projectLeadName?.trim() || null,
      },
    });

    await prisma.projectMember.createMany({
      data: [{ projectId: project.id, userId }],
      skipDuplicates: true,
    });

    const result = await prisma.project.findUnique({
      where: { id: project.id },
      include: projectInclude,
    });

    return successResponse(result, '프로젝트가 생성되었습니다.', 201);
  } catch (e: any) {
    console.error('[POST /api/projects]', e);
    return errorResponse('생성 실패', 500);
  }
}
