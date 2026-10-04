import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canAccessTaskByRole } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { createUserNotification } from '@/lib/notify';
import { requireServiceAuth, serviceHasPermission, serviceProjectAllowed } from '@/lib/service-auth';

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
  const { session, organizationId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  const role = (session!.user as any).role;
  const viewerId = parseInt((session!.user as any).id || '0');
  if (!(await canAccessTaskByRole(task, viewerId, role))) {
    return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  // PARTNER는 "파트너 공개"로 표시된 댓글/답글만 볼 수 있음
  const visibilityFilter = role === 'PARTNER' ? { visibility: 'PARTNER_VISIBLE' } : {};

  // 최상위 댓글만 조회하고 replies를 중첩 포함
  const comments = await prisma.taskComment.findMany({
    where: { taskId, parentId: null, ...visibilityFilter },
    include: {
      author: AUTHOR_SELECT,
      replies: {
        where: visibilityFilter,
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: comments });
}

// 서비스 자격 증명(JIA 등)을 통한 댓글 작성. 일반 세션 사용자 작성과 경로를 완전히 분리해
// 기존 로직에 영향을 주지 않는다. externalRequestId(JIA가 보내는 멱등성 키)로 재시도 시
// 중복 댓글 생성을 막고, 작성자는 null + source='JIA' + externalAuthorLabel로 표시한다.
async function handleServiceComment(req: NextRequest, taskId: number) {
  const auth = await requireServiceAuth(req);
  if (auth.error) return auth.error;
  const { credential } = auth;

  if (!serviceHasPermission(credential, 'COMMENT_CREATE')) {
    return NextResponse.json({ message: '댓글 작성 권한이 없는 키입니다.' }, { status: 403 });
  }

  const body = await req.json();
  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });

  const externalRequestId = (body.externalRequestId || '').trim();
  if (!externalRequestId) {
    return NextResponse.json({ message: 'externalRequestId(멱등성 키)가 필요합니다.' }, { status: 400 });
  }

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: auth.organizationId } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  if (!serviceProjectAllowed(credential, task.projectId)) {
    return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  const parentId: number | null = body.parentId ? parseInt(body.parentId) : null;
  if (parentId) {
    const parent = await prisma.taskComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.taskId !== taskId) {
      return NextResponse.json({ message: '잘못된 부모 댓글입니다.' }, { status: 400 });
    }
  }

  let comment;
  let duplicate = false;
  try {
    comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: null,
        content,
        parentId,
        visibility: 'INTERNAL',
        source: 'JIA',
        externalAuthorLabel: credential.name,
        serviceCredentialId: credential.id,
        externalRequestId,
      },
      include: { author: AUTHOR_SELECT },
    });
  } catch (err: any) {
    // 동일 (credential, externalRequestId) 재시도 — 새 댓글을 만들지 않고 기존 결과를 반환
    if (err?.code === 'P2002') {
      duplicate = true;
      comment = await prisma.taskComment.findFirst({
        where: { serviceCredentialId: credential.id, externalRequestId },
        include: { author: AUTHOR_SELECT },
      });
      if (!comment) {
        return NextResponse.json({ message: '중복 요청 처리 중 오류가 발생했습니다.' }, { status: 500 });
      }
    } else {
      throw err;
    }
  }

  await prisma.serviceRequestLog.upsert({
    where: { serviceCredentialId_externalRequestId: { serviceCredentialId: credential.id, externalRequestId } },
    update: {},
    create: {
      serviceCredentialId: credential.id,
      externalRequestId,
      action: 'COMMENT_CREATE',
      taskId,
      resultStatus: duplicate ? 'DUPLICATE' : 'SUCCESS',
      resultCommentId: comment.id,
    },
  }).catch(() => {});

  if (!duplicate) {
    // JIA 댓글의 @멘션도 내부 사용자 댓글처럼 알림을 보낸다(같은 조직의 활성 사용자만). 답글이면 원댓글 작성자에게도 알린다.
    const mentionCandidates = parseMentionIds(content);
    const parentAuthorId = parentId
      ? (await prisma.taskComment.findUnique({ where: { id: parentId }, select: { authorId: true } }))?.authorId ?? null
      : null;
    const notifyIds = Array.from(new Set([...mentionCandidates, ...(parentAuthorId ? [parentAuthorId] : [])]));
    const mentionTargets = notifyIds.length
      ? (await prisma.user.findMany({ where: { id: { in: notifyIds }, organizationId: auth.organizationId, isActive: true }, select: { id: true } })).map((u) => u.id)
      : [];
    if (mentionTargets.length > 0) {
      Promise.all(
        mentionTargets.map((uid) =>
          createUserNotification(
            uid,
            mentionCandidates.includes(uid) ? 'COMMENT_MENTION' : 'NEW_COMMENT',
            mentionCandidates.includes(uid)
              ? `'${task.title}' 업무 댓글에서 ${credential.name}이(가) 회원님을 멘션했습니다.`
              : `'${task.title}' 업무의 회원님 댓글에 ${credential.name}이(가) 답글을 남겼습니다.`,
            taskId,
            task.organizationId ?? undefined
          )
        )
      ).catch(() => {});
    }
    const generalRecipients = new Set<number>([task.workerId, task.registrantId].filter((v) => !!v && !mentionTargets.includes(v)));
    if (generalRecipients.size > 0) {
      Promise.all(
        Array.from(generalRecipients).map((uid) =>
          createUserNotification(
            uid,
            'NEW_COMMENT',
            `'${task.title}' 업무에 ${credential.name}에서 댓글을 남겼습니다.`,
            taskId,
            task.organizationId ?? undefined
          )
        )
      ).catch(() => {});
    }
  }

  return NextResponse.json({ data: comment }, { status: duplicate ? 200 : 201 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const rawTaskId = parseInt(rawId);
  if (req.headers.get('authorization')) {
    if (isNaN(rawTaskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });
    return handleServiceComment(req, rawTaskId);
  }

  const { session, organizationId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const taskId = parseInt(id);
  if (isNaN(taskId)) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 });

  const body = await req.json();
  const content = (body.content || '').trim();
  if (!content) return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });

  const parentId: number | null = body.parentId ? parseInt(body.parentId) : null;
  const role = (session!.user as any).role;
  // PARTNER가 작성하는 댓글은 항상 파트너 공개(그 외엔 내부 전용 자료를 노출할 수 없음).
  // 내부 사용자는 body.visibility로 선택 가능(기본 내부 전용).
  const visibility = role === 'PARTNER' ? 'PARTNER_VISIBLE' : (body.visibility === 'PARTNER_VISIBLE' ? 'PARTNER_VISIBLE' : 'INTERNAL');

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  const authorScopeId = parseInt((session!.user as any).id || '0');
  if (!(await canAccessTaskByRole(task, authorScopeId, role))) {
    return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (parentId) {
    const parent = await prisma.taskComment.findUnique({ where: { id: parentId } });
    if (!parent || parent.taskId !== taskId) {
      return NextResponse.json({ message: '잘못된 부모 댓글입니다.' }, { status: 400 });
    }
  }

  const authorId = parseInt((session!.user as any).id || '0');
  const comment = await prisma.taskComment.create({
    data: { taskId, authorId, content, parentId, visibility },
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
