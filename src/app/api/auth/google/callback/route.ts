import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exchangeCodeForTokens } from '@/lib/google-calendar';
import { verifyIcalToken } from '@/lib/ical-token';

// GET /api/auth/google/callback — Google OAuth 콜백, 토큰 교환 후 저장
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || '';
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  const redirectWithStatus = (status: 'connected' | 'error') =>
    NextResponse.redirect(`${baseUrl}/settings/calendar-sync?google=${status}`);

  if (oauthError || !code || !state) {
    return redirectWithStatus('error');
  }

  const userId = verifyIcalToken(state);
  if (!userId) {
    return redirectWithStatus('error');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      // refresh_token은 최초 동의(prompt=consent) 시에만 내려옴 — 이미 연결된 계정 재연결 시 누락될 수 있음
      const existing = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
      if (!tokens.refresh_token && existing) {
        await prisma.googleCalendarConnection.update({
          where: { userId },
          data: {
            accessToken: tokens.access_token || existing.accessToken,
            tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : existing.tokenExpiry,
          },
        });
        return redirectWithStatus('connected');
      }
      return redirectWithStatus('error');
    }

    await prisma.googleCalendarConnection.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600_000),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600_000),
      },
    });

    return redirectWithStatus('connected');
  } catch (e) {
    console.error('[google-calendar] callback error:', e);
    return redirectWithStatus('error');
  }
}
