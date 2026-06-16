import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/users - 전체 사용자 목록 (ADMIN만)
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireRole(req, ['ADMIN']);
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
    const { error } = await requireRole(req, ['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !name || !role) {
      return errorResponse('필수 항목이 누락되었습니다.', 400, 'VALID_400');
    }

    // 이미 존재하는지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse('이미 존재하는 이메일입니다.', 409, 'VALID_409');
    }

    // 임시 비밀번호 생성 (실제로는 초대 이메일로 설정 링크를 보내야 함)
    const tempPassword = Math.random().toString(36).slice(-8);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'WORKER',
        passwordHash: tempPassword, // TODO: bcrypt 해싱 필요
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return successResponse(user, '사용자가 초대되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('사용자 초대 중 오류가 발생했습니다.', 500);
  }
}
