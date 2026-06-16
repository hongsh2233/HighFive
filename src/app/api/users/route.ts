import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse, hashPassword, generateTempPassword } from '@/lib/utils';

// GET /api/users - 전체 사용자 목록 (ADMIN만)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const where = role ? { role } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(users, '사용자 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('사용자 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/users - 사용자 초대 (ADMIN만)
export async function POST(req: NextRequest) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { email, name, role } = body;

    // 입력 검증
    if (!email || !name) {
      return errorResponse('이메일과 이름은 필수입니다.', 400, 'VALID_400');
    }

    if (!email.includes('@')) {
      return errorResponse('유효한 이메일 형식이 아닙니다.', 400, 'VALID_400');
    }

    if (name.trim().length < 2) {
      return errorResponse('이름은 최소 2자 이상이어야 합니다.', 400, 'VALID_400');
    }

    const validRoles = ['ADMIN', 'PLANNER', 'WORKER'];
    if (role && !validRoles.includes(role)) {
      return errorResponse('유효하지 않은 역할입니다.', 400, 'VALID_400');
    }

    // 이미 존재하는지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return errorResponse('이미 존재하는 이메일입니다.', 409, 'VALID_409');
    }

    // 임시 비밀번호 생성 및 해싱
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'WORKER',
        passwordHash: hashedPassword,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    console.log(`✅ New user invited: ${email} (temp password: ${tempPassword})`);

    return successResponse(
      { ...user, tempPassword },
      '사용자가 성공적으로 초대되었습니다.',
      201
    );
  } catch (err) {
    console.error(err);
    return errorResponse('사용자 초대 중 오류가 발생했습니다.', 500);
  }
}
