import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireRole, requireSuperAdmin, successResponse, errorResponse } from '@/lib/utils';
import { createUserNotification } from '@/lib/notify';

// GET /api/announcements
export async function GET(req: NextRequest) {
  try {
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const all = new URL(req.url).searchParams.get('all') === 'true';
    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');

    // SUPERADMIN: 시스템 공지(organizationId=null)만 관리
    if (role === 'SUPERADMIN') {
      const announcements = await prisma.announcement.findMany({
        where: { organizationId: null },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse(announcements, '공지 목록 조회 완료');
    }

    if (all) {
      if (!['ADMIN', 'LEADER'].includes(role)) {
        return errorResponse('권한이 없습니다.', 403, 'AUTH_403');
      }
      const where = role === 'ADMIN'
        ? { organizationId }
        : { organizationId, authorId: userId };
      const announcements = await prisma.announcement.findMany({
        where,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse(announcements, '공지 목록 조회 완료');
    }

    // 일반 사용자: 자기 조직 공지 + 시스템 공지(organizationId=null) 모두 표시
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(announcements, '공지 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('공지 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/announcements
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return errorResponse('공지 내용을 입력해주세요.', 400, 'VALID_400');
    }

    // SUPERADMIN: organizationId=null 시스템 공지
    const superAdminAuth = await requireSuperAdmin();
    if (!superAdminAuth.error) {
      const authorId = parseInt((superAdminAuth.session!.user as any).id || '0');
      const announcement = await prisma.announcement.create({
        data: { content: content.trim(), authorId, organizationId: null },
        include: { author: { select: { id: true, name: true } } },
      });
      return successResponse(announcement, '공지가 등록되었습니다.', 201);
    }

    // ADMIN/LEADER: 조직 공지
    const { session, error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    const authorId = parseInt((session!.user as any).id || '0');
    const announcement = await prisma.announcement.create({
      data: { content: content.trim(), authorId, organizationId },
      include: { author: { select: { id: true, name: true } } },
    });

    // 조직 전체 사용자에게 공지 알림 (작성자 제외)
    if (organizationId) {
      const members = await prisma.user.findMany({
        where: { organizationId, isActive: true, id: { not: authorId } },
        select: { id: true },
      });
      await Promise.all(members.map(m =>
        createUserNotification(m.id, 'ANNOUNCEMENT', '새 공지사항이 등록되었습니다.', undefined, organizationId)
      ));
    }

    return successResponse(announcement, '공지가 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('공지 등록 중 오류가 발생했습니다.', 500);
  }
}
