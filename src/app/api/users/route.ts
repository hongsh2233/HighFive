import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, successResponse, errorResponse, hashPassword, generateTempPassword } from '@/lib/utils';

// GET /api/users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const projectId = searchParams.get('projectId');

    // WORKER 역할 필터 조회(업무 담당자 배정/필터용)는 전 역할 허용, 그 외 전체 목록은 ADMIN/MANAGER만 허용
    const auth = role === 'WORKER' ? await requireAuth() : await requireRole(['ADMIN', 'MANAGER']);
    if (auth.error) return auth.error;
    const { session } = auth;

    const sessionRole = (session!.user as any).role;
    const sessionUserId = parseInt((session!.user as any).id || '0');

    let where: any = role ? { role } : {};

    if (sessionRole === 'MANAGER') {
      // MANAGER는 자신이 속한 프로젝트의 멤버만 조회
      const myProjects = await prisma.projectMember.findMany({
        where: { userId: sessionUserId },
        select: { projectId: true },
      });
      const myProjectIds = myProjects.map(p => p.projectId);
      where = { ...where, projectMembers: { some: { projectId: { in: myProjectIds } } } };
    } else if (projectId) {
      where = {
        ...where,
        projectMembers: { some: { projectId: parseInt(projectId) } },
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        leaveDate: true,
        affiliation: true,
        createdAt: true,
        lastLoginAt: true,
        projectMembers: {
          select: { project: { select: { id: true, name: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(users, '사용자 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('사용자 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/users - 사용자 생성
export async function POST(req: NextRequest) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { email, name, role, leaveDate, affiliation, projectIds } = body;

    if (!email || !name) {
      return errorResponse('이메일과 이름은 필수입니다.', 400, 'VALID_400');
    }

    if (!email.includes('@')) {
      return errorResponse('유효한 이메일 형식이 아닙니다.', 400, 'VALID_400');
    }

    if (name.trim().length < 2) {
      return errorResponse('이름은 최소 2자 이상이어야 합니다.', 400, 'VALID_400');
    }

    const validRoles = ['ADMIN', 'MANAGER', 'WORKER'];
    if (role && !validRoles.includes(role)) {
      return errorResponse('유효하지 않은 역할입니다.', 400, 'VALID_400');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return errorResponse('이미 존재하는 이메일입니다.', 409, 'VALID_409');
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'WORKER',
        passwordHash: hashedPassword,
        isActive: true,
        leaveDate: leaveDate ? new Date(leaveDate) : null,
        affiliation: affiliation || null,
      },
      select: { id: true, email: true, name: true, role: true, leaveDate: true, affiliation: true },
    });

    if (projectIds?.length) {
      await prisma.projectMember.createMany({
        data: projectIds.map((pid: number) => ({ projectId: pid, userId: user.id })),
        skipDuplicates: true,
      });
    }

    const userWithProjects = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, name: true, role: true, leaveDate: true, affiliation: true,
        projectMembers: { select: { project: { select: { id: true, name: true } } } },
      },
    });

    console.log(`[USER CREATE] 임시 비밀번호 - ${email}: ${tempPassword}`);
    return successResponse(
      { ...userWithProjects, tempPassword },
      '사용자가 성공적으로 생성되었습니다.',
      201
    );
  } catch (err) {
    console.error(err);
    return errorResponse('사용자 생성 중 오류가 발생했습니다.', 500);
  }
}
