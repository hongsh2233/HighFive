import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

async function canManage(announcementId: number, role: string, userId: number) {
  if (role === 'ADMIN') return true;
  if (role !== 'LEADER') return false;
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  return !!announcement && announcement.authorId === userId;
}

// PATCH /api/announcements/[id] - 수정 (작성자 본인 또는 ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const announcementId = parseInt(id);
    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');

    if (!(await canManage(announcementId, role, userId))) {
      return errorResponse('권한이 없습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { content, isActive } = body;

    const announcement = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(content !== undefined && { content: content.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(announcement, '수정되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('수정 중 오류가 발생했습니다.', 500);
  }
}

// DELETE /api/announcements/[id] - 삭제 (작성자 본인 또는 ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const announcementId = parseInt(id);
    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');

    if (!(await canManage(announcementId, role, userId))) {
      return errorResponse('권한이 없습니다.', 403, 'AUTH_403');
    }

    await prisma.announcement.delete({ where: { id: announcementId } });

    return successResponse(null, '삭제되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('삭제 중 오류가 발생했습니다.', 500);
  }
}
