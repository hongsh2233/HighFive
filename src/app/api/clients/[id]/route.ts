import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/clients/[id] - 고객사 상세(진행 프로젝트/문의 이력 포함)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const client = await prisma.client.findFirst({
      where: { id: parseInt(id), organizationId },
      include: {
        projects: { select: { id: true, name: true, status: true, healthStatus: true } },
        inquiries: { select: { id: true, name: true, type: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) return errorResponse('고객사를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    return successResponse(client, '고객사 상세 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('고객사 상세 조회 중 오류가 발생했습니다.', 500);
  }
}

// PATCH /api/clients/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const { id } = await params;
    const clientId = parseInt(id);
    const existing = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
    if (!existing) return errorResponse('고객사를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    const body = await req.json();
    const { name, contactName, contactPhone, contactEmail, contractStart, contractEnd, notes, lastContactAt } = body;

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(contactPhone !== undefined && { contactPhone: contactPhone?.trim() || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
        ...(contractStart !== undefined && { contractStart: contractStart ? new Date(contractStart) : null }),
        ...(contractEnd !== undefined && { contractEnd: contractEnd ? new Date(contractEnd) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(lastContactAt !== undefined && { lastContactAt: lastContactAt ? new Date(lastContactAt) : null }),
      },
    });

    return successResponse(updated, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/clients/[id] (ADMIN 전용)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const clientId = parseInt(id);
    const existing = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
    if (!existing) return errorResponse('고객사를 찾을 수 없습니다.', 404, 'NOT_FOUND_404');

    await prisma.client.delete({ where: { id: clientId } });
    return successResponse({ id: clientId }, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
