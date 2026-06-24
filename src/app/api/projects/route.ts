import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { ensureProjectsSchema } from '@/lib/db-init';

const projectInclude = {
  creator: { select: { id: true, name: true } },
  members: { include: { user: { select: { id: true, name: true, role: true } } } },
  _count: { select: { tasks: true } },
} as const;

const projectInclude = {
  creator: { select: { id: true, name: true } },
  projectManager: { select: { id: true, name: true } },
  members: { include: { user: { select: { id: true, name: true, role: true } } } },
  _count: { select: { tasks: true } },
} as const;

// GET /api/projects
export async function GET() {
  try {
    await ensureProjectsSchema();
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const where = role === 'ADMIN'
      ? {}
      : { members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(projects);
  } catch (e: any) {
    console.error('[GET /api/projects]', e);
    return errorResponse(`조회 실패: ${e?.message || String(e)}`, 500);
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    await ensureProjectsSchema();
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session!.user as any).role;
    if (!['ADMIN', 'MANAGER'].includes(role)) {
      return errorResponse('권한이 없습니다.', 403);
    }

    const userId = parseInt((session!.user as any).id || '0');
    const { name, projectManagerName, projectLeadName } = await req.json();

    if (!name?.trim()) {
      return errorResponse('프로젝트 이름을 입력해주세요.', 400);
    }

    // Raw SQL로 생성 (Prisma 스키마/DB 컬럼 불일치 우회)
    // status 컬럼은 DEFAULT 'ACTIVE' 이므로 INSERT에서 제외 (컬럼 부재 방어)
    const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO projects (name, "createdBy", "projectManagerName", "projectLeadName", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      name.trim(), userId,
      projectManagerName?.trim() || null,
      projectLeadName?.trim() || null,
    );
    const projectId = rows[0].id;

    await prisma.$executeRawUnsafe(
      `INSERT INTO project_members ("projectId", "userId", "joinedAt")
       VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
      projectId, userId,
    );

    const result = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });

    return successResponse(result, '프로젝트가 생성되었습니다.', 201);
  } catch (e: any) {
    console.error('[POST /api/projects]', e);
    return errorResponse(`생성 실패: ${e?.message || String(e)}`, 500);
  }
}
