import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    if (!org) {
      return errorResponse('존재하지 않는 조직입니다.', 404);
    }

    return successResponse(org);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
