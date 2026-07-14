import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { createUserNotification } from '@/lib/notify';

const AUTHOR_SELECT = { select: { id: true, name: true } };

function parseMentionIds(content: string): number[] {
  const re = /@\[[^\]]+\]\((\d+)\)/g;
  const ids: number[] = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const id = parseInt(m[1]);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  // 최상위 댓글만 조회하고 replies를 중첩 포함
  const comments = await prisma.taskComment.findMany({
    where: { taskId, parentId: null },
    include: {
      author: AUTHOR_SELECT,
      replies: {
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const body = await req.json();
  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });

  const parentId: number | null = body.parentId ? parseInt(body.parentId) : null;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  if (parentId) {
    const parent = await prisma.taskComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.taskId !== taskId) {
      return NextResponse.json({ message: '잘못된 부모 댓글입니다.' }, { status: 400 });
    }
  }

  const authorId = parseInt((session!.user as any).id || '0');
  const comment = await prisma.taskComment.create({
    data: { taskId, authorId, content, parentId },
    include: { author: AUTHOR_SELECT },
  });

  const authorName = (session!.user as any).name || '누군가';
  const mentionIds = parseMentionIds(content).filter((uid) => uid !== authorId);

  // 멘션 알림 발송 (비동기)
  if (mentionIds.length > 0) {
    Promise.all(
      mentionIds.map((uid) =>
        createUserNotification(
          uid,
          'COMMENT_MENTION',
          `'${task.title}' 업무 댓글에서 ${authorName}님이 회원님을 멘션했습니다.`,
          taskId,
          task.organizationId ?? undefined
        )
      )
    ).catch(() => {});
  }

  // 일반 댓글 알림: 멘션과 별개로 담당자/등록자에게 발송(작성자 본인·이미 멘션받은 사람 제외 중복 방지)
  const commentType = parentId ? '답글' : '댓글';
  const generalRecipients = new Set<number>();
  if (task.workerId !== authorId && !mentionIds.includes(task.workerId)) generalRecipients.add(task.workerId);
  if (task.registrantId !== authorId && !mentionIds.includes(task.registrantId)) generalRecipients.add(task.registrantId);
  if (generalRecipients.size > 0) {
    Promise.all(
      Array.from(generalRecipients).map((uid) =>
        createUserNotification(
          uid,
          'NEW_COMMENT',
          `'${task.title}' 업무에 ${authorName}님이 ${commentType}을 남겼습니다.`,
          taskId,
          task.organizationId ?? undefined
        )
      )
    ).catch(() => {});
  }

  return NextResponse.json({ data: comment }, { status: 201 });
}
