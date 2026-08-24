import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';

async function checkAccess(projectId: number, userId: number, role: string) {
  if (role === 'ADMIN') return true;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!membership;
}

// GET /api/projects/[id]/meetings - 회의록 목록 (소속 멤버 또는 ADMIN)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 회의록을 볼 수 있습니다.', 403, 'AUTH_403');
    }

    const meetings = await prisma.meetingNote.findMany({
      where: { projectId },
      include: {
        author: { select: { id: true, name: true } },
        actionItems: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(meetings, '회의록 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('회의록 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/projects/[id]/meetings - 회의록 작성 (소속 멤버 또는 ADMIN)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error, organizationId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 회의록을 작성할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, meetingDate, attendees, content, actionItems } = body;

    if (!title || !content) {
      return errorResponse('제목과 내용을 입력해주세요.', 400);
    }

    const meeting = await prisma.meetingNote.create({
      data: {
        organizationId: organizationId!,
        projectId,
        title: title.trim(),
        meetingDate: meetingDate ? new Date(meetingDate) : null,
        attendees: attendees || null,
        content,
        authorId: userId,
        actionItems: {
          create: Array.isArray(actionItems)
            ? actionItems.map((it: any, idx: number) => ({
                content: it.content,
                assigneeId: it.assigneeId ? parseInt(it.assigneeId) : null,
                targetDate: it.targetDate ? new Date(it.targetDate) : null,
                order: idx,
              }))
            : [],
        },
      },
      include: {
        author: { select: { id: true, name: true } },
        actionItems: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { order: 'asc' } },
      },
    });

    return successResponse(meeting, '회의록이 작성되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('회의록 작성 중 오류가 발생했습니다.', 500);
  }
}
