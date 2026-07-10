import { NextRequest } from 'next/server';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { createAuditLog } from '@/lib/audit';

// GET — current 2FA status
export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session!.user as any).id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true } });
  return successResponse({ totpEnabled: user?.totpEnabled ?? false });
}

// POST — generate secret + QR code (setup step 1)
export async function POST(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session!.user as any).id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, totpEnabled: true } });
  if (!user) return errorResponse('사용자를 찾을 수 없습니다.', 404);
  if (user.totpEnabled) return errorResponse('이미 2FA가 활성화되어 있습니다.', 400);

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'High5',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const secretBase32 = secret.base32;
  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secretBase32 } });

  const otpUri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpUri);

  return successResponse({ secret: secretBase32, qrCodeDataUrl });
}

// DELETE — disable 2FA
export async function DELETE(_req: NextRequest) {
  const { session, organizationId, error } = await requireAuth();
  if (error) return error;
  const userId = parseInt((session!.user as any).id);

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null },
  });

  await createAuditLog({
    organizationId,
    userId,
    userEmail: session!.user?.email,
    action: '2FA_DISABLED',
  });

  return successResponse(null, '2FA가 비활성화되었습니다.');
}
