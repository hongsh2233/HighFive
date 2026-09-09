import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { ensureProjectsSchema } from '@/lib/db-init';

const projectInclude = {
  creator: { select: { id: true, name: true } },
  members: { include: { user: { select: { id: true, name: true, role: true } } } },
  roles: { include: { user: { select: { id: true, name: true } } }, orderBy: { order: 'asc' as const } },
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
    const { name, description, projectManagerName, wikiEnabled, simpleMode, customLabels, roles } = await req.json();

    if (!name?.trim()) {
      return errorResponse('프로젝트 이름을 입력해주세요.', 400);
    }

    const roleList: { label: string; userId?: number; userName?: string }[] = Array.isArray(roles) ? roles : [];
    const roleUserIds = roleList.map((r) => r.userId).filter((v): v is number => !!v);
    const validRoleUserIds = roleUserIds.length
      ? new Set((await prisma.user.findMany({ where: { id: { in: roleUserIds }, organizationId }, select: { id: true } })).map((u) => u.id))
      : new Set<number>();

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: userId,
        organizationId,
        projectManagerName: projectManagerName?.trim() || null,
        wikiEnabled: wikiEnabled !== false,
        simpleMode: !!simpleMode,
        customLabels: customLabels?.trim() || null,
        roles: {
          create: roleList
            .filter((r) => r.label?.trim())
            .map((r, idx) => ({
              label: r.label.trim(),
              userId: r.userId && validRoleUserIds.has(Number(r.userId)) ? Number(r.userId) : null,
              userName: r.userName?.trim() || null,
              order: idx,
            })),
        },
      },
    });

    // 생성자 + 역할에 팀원에서 선택한 사용자를 자동으로 프로젝트 멤버로 등록
    // (담당자 지정 드롭다운 등은 ProjectMember 기준으로 노출되므로, 역할만 지정하고
    // 별도로 멤버 추가를 하지 않아도 업무 등록 시 담당자로 선택 가능해야 한다)
    const memberUserIds = Array.from(new Set([userId, ...Array.from(validRoleUserIds)]));
    await prisma.projectMember.createMany({
      data: memberUserIds.map((uid) => ({ projectId: project.id, userId: uid })),
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
