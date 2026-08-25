import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';
import { isRateLimited } from '@/lib/rate-limit';
import { notifyInquiryReceived } from '@/lib/notify';

// POST /api/organizations/[slug]/inquiries - 홈페이지 문의 접수 (공개, 인증 불필요)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true, isActive: true } });
    if (!org || !org.isActive) {
      return errorResponse('존재하지 않는 조직입니다.', 404);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(`inquiry:${slug}:${ip}`, 5, 60 * 60 * 1000)) {
      return errorResponse('문의를 너무 많이 제출했습니다. 잠시 후 다시 시도해주세요.', 429);
    }

    const body = await req.json();
    const { name, contact, type, content } = body;

    if (!name || !contact || !type || !content) {
      return errorResponse('모든 필드를 입력해주세요.', 400);
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        organizationId: org.id,
        name,
        contact,
        type,
        content,
      },
    });

    notifyInquiryReceived(org.id, name).catch(() => {});

    return successResponse({ id: inquiry.id }, '문의가 접수되었습니다.', 201);
  } catch {
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
