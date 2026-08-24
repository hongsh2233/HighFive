import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/inquiries - 문의 목록 (ADMIN/LEADER)
export async function GET(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = { organizationId };
    if (status) where.status = status;

    const inquiries = await prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(inquiries, '문의 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('문의 목록 조회 중 오류가 발생했습니다.', 500);
  }
}
