import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';
import { requireReadAuth } from '@/lib/service-auth';

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000; // since 미지정 시 최근 24시간
const MAX_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000; // 아무리 오래된 since라도 최근 7일까지만
const MAX_ITEMS = 50;
const PREVIEW_CHARS = 300;

// 댓글 본문의 멘션 표기 @[이름](id)를 "@이름"으로 바꾸고 길이를 제한한다(연동 쪽에서 읽기 쉬운 미리보기용).
function commentPreview(content: string): string {
  const plain = content.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1').replace(/\s+/g, ' ').trim();
  return plain.length > PREVIEW_CHARS ? `${plain.slice(0, PREVIEW_CHARS)}…` : plain;
}

// GET /api/integrations/jia/inbox?userEmail=...&since=ISO
// 서비스 자격 증명(JIA) 전용 "지아 수신함": 지아 계정에 배정된 업무와 지아가 @멘션된 댓글을 since 이후로 돌려준다.
// READ 권한과 키의 프로젝트 범위를 그대로 따르며, 조회만 한다(업무 생성·상태 변경 없음).
export async function GET(req: NextRequest) {
  try {
    const auth = await requireReadAuth(req);
    if (auth.error) return auth.error;
    if (!auth.isService) return errorResponse('서비스 API 키로만 호출할 수 있습니다.', 403, 'AUTH_403');

    const { searchParams } = new URL(req.url);
    const userEmail = (searchParams.get('userEmail') || '').trim().toLowerCase();
    if (!userEmail) return errorResponse('userEmail이 필요합니다.', 400, 'VALIDATION_ERROR');

    const now = Date.now();
    const sinceRaw = searchParams.get('since');
    const parsed = sinceRaw ? Date.parse(sinceRaw) : NaN;
    if (sinceRaw && isNaN(parsed)) return errorResponse('since 형식이 올바르지 않습니다.', 400, 'VALIDATION_ERROR');
    const since = new Date(Math.max(isNaN(parsed) ? now - DEFAULT_LOOKBACK_MS : parsed, now - MAX_LOOKBACK_MS));

    // 키가 속한 조직의 사용자만 대상으로 한다(다른 조직 사용자는 존재 여부도 드러내지 않음)
    const jia = await prisma.user.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' }, organizationId: auth.organizationId, isActive: true },
      select: { id: true, name: true },
    });
    if (!jia) return errorResponse('이 조직에서 해당 사용자를 찾을 수 없습니다.', 404, 'NOT_FOUND');

    const taskScope: Record<string, unknown> = { organizationId: auth.organizationId };
    if (auth.allowedProjectIds !== null) {
      taskScope.projectId = { in: auth.allowedProjectIds.length ? auth.allowedProjectIds : [-1] };
    }

    const [tasks, comments] = await Promise.all([
      prisma.task.findMany({
        where: { ...taskScope, workerId: jia.id, updatedAt: { gte: since } },
        orderBy: { updatedAt: 'desc' },
        take: MAX_ITEMS,
        select: {
          id: true, title: true, status: true, priority: true, targetDate: true, createdAt: true, updatedAt: true,
          project: { select: { id: true, name: true } },
          registrant: { select: { id: true, name: true } },
        },
      }),
      prisma.taskComment.findMany({
        where: {
          content: { contains: `](${jia.id})` },
          createdAt: { gte: since },
          task: taskScope,
          NOT: { authorId: jia.id },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_ITEMS,
        select: {
          id: true, content: true, createdAt: true, source: true, externalAuthorLabel: true,
          author: { select: { id: true, name: true } },
          task: { select: { id: true, title: true, status: true, project: { select: { id: true, name: true } } } },
        },
      }),
    ]);

    return successResponse({
      user: jia,
      since: since.toISOString(),
      serverTime: new Date(now).toISOString(),
      assignedTasks: tasks,
      mentions: comments
        .filter((c) => new RegExp(`@\\[[^\\]]+\\]\\(${jia.id}\\)`).test(c.content))
        .map(({ content, externalAuthorLabel, source, author, ...rest }) => ({
          ...rest,
          authorName: author?.name ?? externalAuthorLabel ?? (source === 'JIA' ? 'JIA 연동' : '알 수 없음'),
          preview: commentPreview(content),
        })),
    });
  } catch (error) {
    console.error('Jia inbox error:', error);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
