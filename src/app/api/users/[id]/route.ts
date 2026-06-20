import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const userId = parseInt(id);
    const body = await req.json();
    const { name, role, isActive, leaveDate, affiliation, projectIds } = body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(leaveDate !== undefined && { leaveDate: leaveDate ? new Date(leaveDate) : null }),
        ...(affiliation !== undefined && { affiliation: affiliation || null }),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, leaveDate: true, affiliation: true },
    });

    if (projectIds !== undefined) {
      await prisma.projectMember.deleteMany({ where: { userId } });
      if (projectIds.length > 0) {
        await prisma.projectMember.createMany({
          data: projectIds.map((pid: number) => ({ projectId: pid, userId })),
          skipDuplicates: true,
        });
      }
    }

    return successResponse(user, '수정되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('수정 실패', 500);
  }
}

// DELETE /api/users/[id] - 비활성화
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    });

    return successResponse(user, '비활성화되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('비활성화 실패', 500);
  }
}
