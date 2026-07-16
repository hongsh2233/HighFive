import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';
import { notifyPlatformAdminsSlack } from '@/lib/platform-notify';
import { sendEmail } from '@/lib/email';
import { demoRequestConfirmationEmail, demoRequestAdminAlertEmail } from '@/lib/email-templates';

// 랜딩 페이지 공개 폼용 경량 스팸 방지(IP당 1시간에 5건) — 인메모리, 재시작 시 초기화.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const attempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/demo-requests - 무료 데모 신청 (공개, 인증 불필요)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    if (isRateLimited(ip)) {
      return errorResponse('잠시 후 다시 시도해주세요.', 429, 'RATE_429');
    }

    const body = await req.json();
    const { name, company, email, phone, message } = body;

    if (!name?.trim() || !company?.trim() || !email?.trim()) {
      return errorResponse('이름, 회사명, 이메일은 필수입니다.', 400, 'VALID_400');
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return errorResponse('유효한 이메일 주소를 입력해주세요.', 400, 'VALID_400');
    }

    const created = await prisma.demoRequest.create({
      data: {
        name: name.trim().slice(0, 100),
        company: company.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        phone: phone?.trim().slice(0, 50) || null,
        message: message?.trim().slice(0, 1000) || null,
      },
    });

    notifyPlatformAdminsSlack(
      `🎉 새 무료 데모 신청\n회사: ${created.company}\n이름: ${created.name}\n이메일: ${created.email}${created.phone ? `\n연락처: ${created.phone}` : ''}${created.message ? `\n메시지: ${created.message}` : ''}`
    ).catch(() => {});

    sendEmail({
      to: created.email,
      subject: '[High5] 데모 신청이 접수되었습니다',
      html: demoRequestConfirmationEmail(created.name),
    }).catch(() => {});

    if (process.env.PLATFORM_ADMIN_EMAIL) {
      sendEmail({
        to: process.env.PLATFORM_ADMIN_EMAIL,
        subject: `[High5] 새 데모 신청 — ${created.company}`,
        html: demoRequestAdminAlertEmail(created),
      }).catch(() => {});
    }

    return successResponse(null, '데모 신청이 접수되었습니다. 곧 연락드리겠습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('신청 중 오류가 발생했습니다.', 500);
  }
}
