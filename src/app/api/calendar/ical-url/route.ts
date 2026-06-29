import { NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/utils';
import { generateIcalToken } from '@/lib/ical-token';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const token = generateIcalToken(userId);
    const baseUrl = process.env.NEXTAUTH_URL || '';
    const url = `${baseUrl}/api/calendar/ical?token=${token}`;

    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    console.error(err);
    return errorResponse('캘린더 URL 생성 중 오류가 발생했습니다.', 500);
  }
}
