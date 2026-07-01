import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

const REQUEST_TYPES = ['LEAVE', 'SUPPLY'];

const requesterInclude = {
  requester: { select: { id: true, name: true } },
  approver: { select: { id: true, name: true } },
} as const;

// GET /api/requests?scope=mine|approvals - 신청 목록
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;
    const scope = new URL(req.url).searchParams.get('scope') || 'mine';

    const where =
      scope === 'approvals'
        ? role === 'ADMIN'
          ? { OR: [{ approverId: userId }, { approverId: null }] }
          : { approverId: userId }
        : { requesterId: userId };

    const requests = await prisma.request.findMany({
      where,
      include: requesterInclude,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(requests, '신청 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('신청 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/requests - 휴가/비품 신청
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const requesterId = parseInt((session!.user as any).id || '0');
    const body = await req.json();
    const { type, title, content, startDate, endDate, isAnnouncement } = body;

    if (!REQUEST_TYPES.includes(type)) {
      return errorResponse('유효하지 않은 신청 유형입니다.', 400, 'VALID_400');
    }
    if (!title?.trim()) {
      return errorResponse('제목을 입력해주세요.', 400, 'VALID_400');
    }
    if (type === 'LEAVE') {
      if (!startDate || !endDate) {
        return errorResponse('휴가 시작일과 종료일을 입력해주세요.', 400, 'VALID_400');
      }
      if (new Date(endDate) < new Date(startDate)) {
        return errorResponse('종료일은 시작일보다 빠를 수 없습니다.', 400, 'VALID_400');
      }
    }
    if (type === 'SUPPLY' && !content?.trim()) {
      return errorResponse('신청 품목/사유를 입력해주세요.', 400, 'VALID_400');
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404);
    }

    // '공지로 등록(전결)'은 ADMIN/LEADER만 사용 가능 — WORKER가 임의로 보내도 서버에서 무시
    const announce = !!isAnnouncement && ['ADMIN', 'LEADER'].includes(requester.role);

    const request = await prisma.request.create({
      data: {
        type,
        title: title.trim(),
        content: content?.trim() || null,
        startDate: type === 'LEAVE' ? new Date(startDate) : null,
        endDate: type === 'LEAVE' ? new Date(endDate) : null,
        isAnnouncement: announce,
        requesterId,
        approverId: announce ? requesterId : requester.managerId,
        status: announce ? 'APPROVED' : 'PENDING',
        decidedAt: announce ? new Date() : null,
      },
      include: requesterInclude,
    });

    if (announce) {
      const typeLabel = type === 'LEAVE' ? '휴가' : '비품';
      const period =
        type === 'LEAVE'
          ? ` (${new Date(startDate).toLocaleDateString('ko-KR')} ~ ${new Date(endDate).toLocaleDateString('ko-KR')})`
          : '';
      await prisma.announcement.create({
        data: {
          content: `[${typeLabel} 공지] ${requester.name}: ${title.trim()}${period}`,
          authorId: requesterId,
          requestId: request.id,
        },
      });
    }

    return successResponse(request, '신청이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('신청 등록 중 오류가 발생했습니다.', 500);
  }
}
