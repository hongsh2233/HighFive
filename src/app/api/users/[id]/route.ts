import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const userId = parseInt(id);

    // 같은 조직의 사용자만 수정 가능
    const target = await prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!target) return errorResponse('사용자를 찾을 수 없습니다.', 404);
    const body = await req.json();
    const { name, role, isActive, leaveDate, affiliation, projectIds, managerId } = body;

    if (managerId !== undefined && managerId !== null && parseInt(managerId) === userId) {
      return errorResponse('본인을 담당 리더로 지정할 수 없습니다.', 400, 'VALID_400');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(leaveDate !== undefined && { leaveDate: leaveDate ? new Date(leaveDate) : null }),
        ...(affiliation !== undefined && { affiliation: affiliation || null }),
        ...(managerId !== undefined && { managerId: managerId ? parseInt(managerId) : null }),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, leaveDate: true, affiliation: true, managerId: true },
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

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const { id } = await params;
    const userId = parseInt(id);
    const hard = new URL(req.url).searchParams.get('hard') === 'true';

    const target = await prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!target) return errorResponse('사용자를 찾을 수 없습니다.', 404);

    if (hard) {
      const callerRole = (session!.user as any).role;
      if (callerRole !== 'ADMIN') {
        return errorResponse('해당 권한이 없습니다.', 403);
      }
      const taskCount = await prisma.task.count({
        where: { OR: [{ workerId: userId }, { registrantId: userId }] },
      });
      if (taskCount > 0) {
        return errorResponse(`이 팀원에게 연결된 업무 ${taskCount}건이 있어 삭제할 수 없습니다. 먼저 업무를 재배정하세요.`, 409);
      }
      await prisma.projectMember.deleteMany({ where: { userId } });
      await prisma.timeLog.deleteMany({ where: { workerId: userId } });
      await prisma.user.delete({ where: { id: userId } });
      return successResponse({ id: userId }, '삭제되었습니다.');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    });

    return successResponse(user, '비활성화되었습니다.');
  } catch (e) {
    console.error(e);
    return errorResponse('처리 실패', 500);
  }
}
