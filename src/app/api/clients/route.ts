import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/clients - 고객사 목록 (ADMIN/LEADER)
export async function GET() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const clients = await prisma.client.findMany({
      where: { organizationId },
      include: {
        _count: { select: { projects: true, inquiries: true } },
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(clients, '고객사 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('고객사 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/clients - 고객사 등록 (ADMIN/LEADER)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const body = await req.json();
    const { name, contactName, contactPhone, contactEmail, contractStart, contractEnd, notes } = body;
    if (!name?.trim()) return errorResponse('고객사명을 입력해주세요.', 400, 'VALID_400');

    const client = await prisma.client.create({
      data: {
        organizationId: organizationId!,
        name: name.trim(),
        contactName: contactName?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        contractStart: contractStart ? new Date(contractStart) : null,
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        notes: notes?.trim() || null,
      },
    });

    return successResponse(client, '고객사가 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('고객사 등록 중 오류가 발생했습니다.', 500);
  }
}
