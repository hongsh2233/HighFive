import { NextRequest } from 'next/server';
import * as OTPAuth from 'otpauth';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { createAuditLog } from '@/lib/audit';

// POST — verify OTP code and activate 2FA
export async function POST(req: NextRequest) {
  const { session, organizationId, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session!.user as any).id);

  const { token } = await req.json();
  if (!token) return errorResponse('OTP 코드를 입력해주세요.', 400);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!user?.totpSecret) return errorResponse('2FA 설정을 먼저 시작해주세요.', 400);
  if (user.totpEnabled) return errorResponse('이미 2FA가 활성화되어 있습니다.', 400);

  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totpSecret),
  });

  const delta = totp.validate({ token: String(token).replace(/\s/g, ''), window: 1 });
  if (delta === null) return errorResponse('OTP 코드가 올바르지 않습니다.', 400);

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });

  await createAuditLog({
    organizationId,
    userId,
    userEmail: session!.user?.email,
    action: '2FA_ENABLED',
  });

  return successResponse(null, '2FA가 활성화되었습니다.');
}
