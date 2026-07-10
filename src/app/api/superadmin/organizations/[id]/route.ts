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

    const { plan, isActive, bizNo, phone, ceoName } = body;

    const data: { plan?: string; isActive?: boolean; bizNo?: string | null; phone?: string | null; ceoName?: string | null } = {};
    if (plan !== undefined) data.plan = plan;
    if (isActive !== undefined) data.isActive = isActive;
    if (bizNo !== undefined) data.bizNo = bizNo || null;
    if (phone !== undefined) data.phone = phone || null;
    if (ceoName !== undefined) data.ceoName = ceoName || null;

    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    return successResponse(org);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
