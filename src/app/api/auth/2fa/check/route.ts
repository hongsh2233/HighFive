import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse } from '@/lib/utils';

// Public endpoint — check if an email requires TOTP at login
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return successResponse({ totpEnabled: false });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { totpEnabled: true },
  });
  return successResponse({ totpEnabled: user?.totpEnabled ?? false });
}
