import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { getGoogleAuthUrl, isGoogleCalendarConfigured } from '@/lib/google-calendar';
import { generateIcalToken } from '@/lib/ical-token';

// GET /api/auth/google/authorize — Google OAuth 동의화면으로 리다이렉트
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ success: false, message: 'Google 캘린더 연동이 아직 설정되지 않았습니다.' }, { status: 503 });
  }

  const userId = parseInt((session!.user as any).id || '0');
  const state = generateIcalToken(userId); // 서명된 토큰을 state(CSRF 방지)로 재사용
  const url = getGoogleAuthUrl(state);
  if (!url) {
    return NextResponse.json({ success: false, message: 'Google 캘린더 연동이 아직 설정되지 않았습니다.' }, { status: 503 });
  }

  return NextResponse.redirect(url);
}
