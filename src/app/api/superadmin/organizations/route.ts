import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, requireSuperAdmin } from '@/lib/utils';

export async function GET(_req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
      },
    });

    return successResponse(organizations);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, slug, bizNo, phone, ceoName, plan } = body;

    if (!name || !slug) return errorResponse('회사명과 슬러그는 필수입니다.', 400);
    if (!/^[a-z0-9-]+$/.test(slug)) return errorResponse('슬러그는 소문자, 숫자, 하이픈만 허용됩니다.', 400);

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) return errorResponse('이미 사용 중인 슬러그입니다.', 409);

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        bizNo: bizNo || null,
        phone: phone || null,
        ceoName: ceoName || null,
        plan: plan || 'FREE',
      },
    });

    return successResponse(org, '조직이 생성되었습니다.', 201);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
