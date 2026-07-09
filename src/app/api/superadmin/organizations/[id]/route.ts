import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, requireSuperAdmin } from '@/lib/utils';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const orgId = parseInt(id);
    const body = await req.json();
    const { plan, isActive } = body;

    const data: { plan?: string; isActive?: boolean } = {};
    if (plan !== undefined) data.plan = plan;
    if (isActive !== undefined) data.isActive = isActive;

    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    return successResponse(org);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
