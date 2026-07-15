import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, hashPassword } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgName, slug, adminEmail, adminName, password } = body;

    if (!orgName || !slug || !adminEmail || !adminName || !password) {
      return errorResponse('모든 필드를 입력해주세요.', 400);
    }

    if (password.length < 8) {
      return errorResponse('비밀번호는 8자 이상이어야 합니다.', 400);
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return errorResponse('슬러그는 영소문자, 숫자, 하이픈만 사용 가능합니다.', 400);
    }

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return errorResponse('이미 사용 중인 슬러그입니다.', 409);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return errorResponse('이미 사용 중인 이메일입니다.', 409);
    }

    const passwordHash = await hashPassword(password);

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
        plan: 'FREE',
        isActive: true,
        users: {
          create: {
            email: adminEmail,
            name: adminName,
            role: 'ADMIN',
            passwordHash,
            isActive: true,
          },
        },
      },
    });

    return successResponse({ orgId: org.id, slug: org.slug }, '조직이 생성되었습니다.', 201);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
