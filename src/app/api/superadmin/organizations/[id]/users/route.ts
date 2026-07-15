import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, requireSuperAdmin, hashPassword } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const orgId = parseInt(id);

    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(users);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const orgId = parseInt(id);
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) return errorResponse('이름, 이메일, 비밀번호는 필수입니다.', 400);
    if (password.length < 8) return errorResponse('비밀번호는 8자 이상이어야 합니다.', 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse('이미 사용 중인 이메일입니다.', 409);

    const hash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        role: role || 'ADMIN',
        organizationId: orgId,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return successResponse(newUser, '사용자가 생성되었습니다.', 201);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
