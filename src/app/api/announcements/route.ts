import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, successResponse, errorResponse } from '@/lib/utils';

// GET /api/announcements - 활성 공지 목록 (전 역할). ?all=true 는 관리용(ADMIN/LEADER, 비활성 포함)
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const all = new URL(req.url).searchParams.get('all') === 'true';
    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');

    if (all) {
      if (!['ADMIN', 'LEADER'].includes(role)) {
        return errorResponse('권한이 없습니다.', 403, 'AUTH_403');
      }
      const where = role === 'ADMIN' ? {} : { authorId: userId };
      const announcements = await prisma.announcement.findMany({
        where,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse(announcements, '공지 목록 조회 완료');
    }

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(announcements, '공지 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('공지 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/announcements - 공지 등록 (ADMIN/LEADER)
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return errorResponse('공지 내용을 입력해주세요.', 400, 'VALID_400');
    }

    const authorId = parseInt((session!.user as any).id || '0');
    const announcement = await prisma.announcement.create({
      data: { content: content.trim(), authorId },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(announcement, '공지가 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('공지 등록 중 오류가 발생했습니다.', 500);
  }
}
