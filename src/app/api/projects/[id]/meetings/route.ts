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

// GET /api/projects/[id]/meetings - 프로젝트 회의록 목록 (소속 멤버 또는 ADMIN)
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

    const notes = await prisma.meetingNote.findMany({
      where: { projectId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return successResponse(notes, '회의록 목록 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('회의록 목록 조회 중 오류가 발생했습니다.', 500);
  }
}

// POST /api/projects/[id]/meetings - 회의록 작성 (소속 멤버 또는 ADMIN)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const projectId = parseInt(id);
    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    if (!(await checkAccess(projectId, userId, role))) {
      return errorResponse('해당 프로젝트 멤버만 회의록을 작성할 수 있습니다.', 403, 'AUTH_403');
    }

    const body = await req.json();
    const { title, content, attendees, meetingDate } = body;

    if (!title?.trim()) {
      return errorResponse('제목을 입력해주세요.', 400, 'VALID_400');
    }
    if (!content?.trim()) {
      return errorResponse('내용을 입력해주세요.', 400, 'VALID_400');
    }

    const note = await prisma.meetingNote.create({
      data: {
        projectId,
        title: title.trim(),
        content: content.trim(),
        attendees: attendees?.trim() || null,
        meetingDate: meetingDate ? new Date(meetingDate) : null,
        authorId: userId,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return successResponse(note, '회의록이 등록되었습니다.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('회의록 등록 중 오류가 발생했습니다.', 500);
  }
}
