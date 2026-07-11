import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/settings/organization
export async function GET() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId! },
      select: {
        id: true,
        name: true,
        slug: true,
        displayName: true,
        logoUrl: true,
        bizNo: true,
        phone: true,
        ceoName: true,
        address: true,
        deadlineAlertDays: true,
        plan: true,
      },
    });

    if (!org) return errorResponse('조직을 찾을 수 없습니다.', 404);
    return successResponse(org, '조직 설정 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('조직 설정 조회 중 오류가 발생했습니다.', 500);
  }
}

// PATCH /api/settings/organization
export async function PATCH(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { displayName, bizNo, phone, ceoName, address, deadlineAlertDays } = body;

    const data: Record<string, unknown> = {};
    if (displayName !== undefined) data.displayName = displayName?.trim() || null;
    if (bizNo !== undefined) data.bizNo = bizNo?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (ceoName !== undefined) data.ceoName = ceoName?.trim() || null;
    if (address !== undefined) data.address = address?.trim() || null;
    if (deadlineAlertDays !== undefined) {
      const days = parseInt(deadlineAlertDays);
      if (isNaN(days) || days < 1 || days > 30) {
        return errorResponse('마감 알림 기준일은 1~30 사이여야 합니다.', 400, 'VALID_400');
      }
      data.deadlineAlertDays = days;
    }

    const org = await prisma.organization.update({
      where: { id: organizationId! },
      data,
      select: {
        id: true, name: true, slug: true, displayName: true, logoUrl: true,
        bizNo: true, phone: true, ceoName: true, address: true, deadlineAlertDays: true, plan: true,
      },
    });

    return successResponse(org, '조직 설정이 저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('조직 설정 저장 중 오류가 발생했습니다.', 500);
  }
}
