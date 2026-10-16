import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createUserNotification } from '@/lib/notify';
import { requireServiceAuth, serviceHasPermission, serviceProjectAllowed } from '@/lib/service-auth';
import { mentionTargetWhere } from '@/lib/mcp/mention-scope';
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

export async function handleServiceComment(req: NextRequest, taskId: number, mcpScope?: { userId: number; projectIds: number[] }) {
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

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: auth.organizationId, ...(mcpScope ? { projectId: { in: mcpScope.projectIds }, OR: [{ workerId: mcpScope.userId }, { registrantId: mcpScope.userId }] } : {}) } });
  if (!task) return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });

  if (!serviceProjectAllowed(credential, task.projectId)) {
    return NextResponse.json({ message: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (mcpScope) {
    const ids = parseMentionIds(content);
    const targets = await prisma.user.findMany({ where: { id: { in: ids }, organizationId: auth.organizationId, isActive: true,
      ...mentionTargetWhere(task.workerId, task.projectId!) }, select: { id: true } });
    if (targets.length !== ids.length) return NextResponse.json({ message: '멘션 대상에게 이 업무 접근 권한이 없습니다.' }, { status: 403 });
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
      if (comment && (comment.taskId !== taskId || comment.content !== content || comment.parentId !== parentId)) {
        return NextResponse.json({ message: '같은 요청 ID를 다른 댓글에 사용할 수 없습니다.' }, { status: 409 });
      }
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

