import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireAuth, successResponse, errorResponse, CAPABILITY_KEYS, getCapabilities } from '@/lib/utils';
import type { CapabilityKey } from '@/lib/utils';

async function setCapability(userId: number, key: CapabilityKey, value: boolean) {
  await prisma.userCapability.upsert({
    where: { userId_key: { userId, key } },
    update: { value },
    create: { userId, key, value },
  });
}

// GET /api/users/[id] - 프로필 조회 (같은 조직 내 누구나)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const user = await prisma.user.findFirst({
      where: { id: parseInt(id), organizationId },
      select: {
        id: true, name: true, email: true, role: true, affiliation: true, orgUnit: true,
        manager: { select: { id: true, name: true } },
      },
    });
    if (!user) return errorResponse('사용자를 찾을 수 없습니다.', 404);
    return successResponse(user);
  } catch (err) {
    console.error(err);
    return errorResponse('사용자 조회 중 오류가 발생했습니다.', 500);
  }
}

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
    const { name, email, role, isActive, leaveDate, affiliation, projectIds, managerId, orgUnit, canManageCardExpense, canManageLedger, canManageWeeklyReport, capabilities } = body;

    if (managerId !== undefined && managerId !== null && parseInt(managerId) === userId) {
      return errorResponse('본인을 담당 리더로 지정할 수 없습니다.', 400, 'VALID_400');
    }

    if (email !== undefined && email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return errorResponse('이미 사용 중인 이메일입니다.', 409, 'VALID_409');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email !== undefined && { email }),
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(leaveDate !== undefined && { leaveDate: leaveDate ? new Date(leaveDate) : null }),
        ...(affiliation !== undefined && { affiliation: affiliation || null }),
        ...(orgUnit !== undefined && { orgUnit: orgUnit || null }),
        ...(managerId !== undefined && { managerId: managerId ? parseInt(managerId) : null }),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, leaveDate: true, affiliation: true, orgUnit: true, managerId: true },
    });

    if (canManageCardExpense !== undefined) await setCapability(userId, 'CARD_EXPENSE', !!canManageCardExpense);
    if (canManageLedger !== undefined) await setCapability(userId, 'LEDGER', !!canManageLedger);
    if (canManageWeeklyReport !== undefined) await setCapability(userId, 'WEEKLY_REPORT', !!canManageWeeklyReport);

    // 일반화된 담당 권한(capability) 묶음 — 라운드8: PROJECT_MANAGE/APPROVAL/ANNOUNCEMENT_MANAGE 등
    if (capabilities && typeof capabilities === 'object') {
      for (const key of CAPABILITY_KEYS) {
        if (capabilities[key] !== undefined) {
          await setCapability(userId, key, !!capabilities[key]);
        }
      }
    }

    if (projectIds !== undefined) {
      await prisma.projectMember.deleteMany({ where: { userId } });
      if (projectIds.length > 0) {
        await prisma.projectMember.createMany({
          data: projectIds.map((pid: number) => ({ projectId: pid, userId })),
          skipDuplicates: true,
        });
      }
    }

    const updatedCapabilities = await getCapabilities(userId);
    return successResponse(
      {
        ...user,
        capabilities: updatedCapabilities,
        canManageCardExpense: updatedCapabilities.CARD_EXPENSE,
        canManageLedger: updatedCapabilities.LEDGER,
        canManageWeeklyReport: updatedCapabilities.WEEKLY_REPORT,
      },
      '수정되었습니다.'
    );
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
