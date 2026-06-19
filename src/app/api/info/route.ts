import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/info - 전체 FAQ 목록 조회 (인증 사용자 모두)
export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const items = await prisma.infoItem.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return successResponse(items);
  } catch (e) {
    console.error(e);
    return errorResponse('조회 실패', 500);
  }
}

// POST /api/info - FAQ 항목 생성 (관리자만)
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireRole(['ADMIN']);
    if (error) return error;

    const body = await req.json();
    const { question, answer, order } = body;

    if (!question?.trim() || !answer?.trim()) {
      return errorResponse('질문과 답변을 입력해주세요.', 400);
    }

    const item = await prisma.infoItem.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        order: order ?? 0,
        createdBy: parseInt((session!.user as any).id || '0'),
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return successResponse(item, '생성되었습니다.', 201);
  } catch (e) {
    console.error(e);
    return errorResponse('생성 실패', 500);
  }
}
