import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

const MAX_PAGES = 3;

// GET /api/my-pages - 내 자료 보관 문서 목록
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');

    const pages = await prisma.userPage.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return successResponse(pages, '문서 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('문서 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/my-pages - 새 문서 작성 (최대 3개)
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');

    const body = await req.json();
    const { title, content } = body;

    if (!title?.trim()) {
      return errorResponse('제목을 입력해주세요.', 400, 'VALID_400');
    }

    const count = await prisma.userPage.count({ where: { userId } });
    if (count >= MAX_PAGES) {
      return errorResponse(`문서는 최대 ${MAX_PAGES}개까지 만들 수 있습니다.`, 400, 'VALID_400');
    }

    const page = await prisma.userPage.create({
      data: { userId, title: title.trim(), content: content?.trim() || '' },
    });

    return successResponse(page, '문서가 생성되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('문서 생성 중 오류가 발생했습니다.', 500);
  }
}
