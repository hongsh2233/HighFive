import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse, hashPassword, generateTempPassword } from '@/lib/utils';
import { createAuditLog } from '@/lib/audit';
import { isRateLimited } from '@/lib/rate-limit';

// 관리자 1명당 10분에 10회 — 실수로 연타하거나 계정 탈취 후 대량 초기화하는 것을 막는 1차 방어선.
const RESET_LIMIT = 10;
const RESET_WINDOW_MS = 10 * 60 * 1000;

// POST /api/users/[id]/reset-password — 관리자가 같은 조직 팀원의 비밀번호를 임시 비밀번호로 초기화한다.
// 규칙: ADMIN/SUPERADMIN만, 같은 조직 대상만, ADMIN은 SUPERADMIN을 초기화할 수 없음, 본인은 불가(일반 변경 화면 사용).
// 결과: 새 임시 비밀번호(응답으로 1회만 반환, 로그 금지) + mustChangePassword + 기존 로그인 세션 무효화 + 감사 로그.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, session, organizationId } = await requireRole(['ADMIN', 'SUPERADMIN']);
    if (error) return error;
    if (!organizationId) return errorResponse('권한이 없습니다.', 403, 'AUTH_403');

    const actorId = parseInt((session!.user as any).id || '0');
    const actorRole = (session!.user as any).role as string;

    const { id } = await params;
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return errorResponse('잘못된 사용자 ID입니다.', 400, 'VALID_400');
    }
    if (targetId === actorId) {
      return errorResponse('본인 비밀번호는 비밀번호 변경 화면에서 바꿔주세요.', 400, 'VALID_400');
    }

    if (isRateLimited(`reset-password:${actorId}`, RESET_LIMIT, RESET_WINDOW_MS)) {
      return errorResponse('비밀번호 초기화 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429, 'RATE_429');
    }

    const target = await prisma.user.findFirst({
      where: { id: targetId, organizationId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!target) return errorResponse('사용자를 찾을 수 없습니다.', 404);
    if (target.role === 'SUPERADMIN' && actorRole !== 'SUPERADMIN') {
      return errorResponse('최고관리자의 비밀번호는 초기화할 수 없습니다.', 403, 'AUTH_403');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true, sessionsRevokedAt: new Date() },
    });
    // 접속 기기 목록(UserSession)도 정리 — 실제 차단은 sessionsRevokedAt이 requireAuth에서 한다.
    await prisma.userSession.deleteMany({ where: { userId: target.id } });

    await createAuditLog({
      organizationId,
      userId: actorId,
      userEmail: session!.user?.email,
      action: 'PASSWORD_RESET',
      targetType: 'User',
      targetId: target.id,
      detail: { email: target.email, name: target.name },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    });

    const res = successResponse(
      { id: target.id, name: target.name, tempPassword },
      '비밀번호가 초기화되었습니다.'
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[users/reset-password] 비밀번호 초기화 실패', err instanceof Error ? err.message : err);
    return errorResponse('비밀번호 초기화 중 오류가 발생했습니다.', 500);
  }
}
