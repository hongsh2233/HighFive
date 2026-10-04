import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';
import { requireReadAuth } from '@/lib/service-auth';
import { getProjectStatuses } from '@/lib/task-status';

const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 자율 응답용이라 최근 24시간까지만
const MAX_ITEMS = 30;
const PREVIEW_CHARS = 500;
const THREAD_COMMENTS = 6;

function plain(content: string, max = PREVIEW_CHARS): string {
  const text = content.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const time = Date.parse(value);
  return isNaN(time) ? null : new Date(time);
}

// GET /api/integrations/jia/activity?userEmail=&since=ISO&dueFrom=ISO&dueTo=ISO
// 서비스 키(READ) 전용 "지아 활동 피드" — 지아가 자율로 답할 거리:
//  - messages: since 이후, 지아가 참여한 업무에서 지아에게 온 댓글(지아 @멘션, 또는 지아가 쓴 댓글에 달린 답글). 지아 본인·JIA 키 작성 제외.
//    각 항목에 그 업무의 최근 댓글 몇 개(맥락)를 함께 준다.
//  - dueTasks: 목표일이 [dueFrom, dueTo) 안이고 완료 상태가 아니며 담당자가 지아가 아닌, 지아가 참여한 업무.
// "참여" = 지아가 담당자·등록자이거나, 지아가 언급됐거나, 지아(계정 또는 이 키)가 댓글을 단 업무. 조회 전용.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireReadAuth(req);
    if (auth.error) return auth.error;
    if (!auth.isService) return errorResponse('서비스 API 키로만 호출할 수 있습니다.', 403, 'AUTH_403');

    const { searchParams } = new URL(req.url);
    const userEmail = (searchParams.get('userEmail') || '').trim().toLowerCase();
    if (!userEmail) return errorResponse('userEmail이 필요합니다.', 400, 'VALIDATION_ERROR');
    const now = Date.now();
    const sinceParam = parseDate(searchParams.get('since'));
    const since = new Date(Math.max(sinceParam?.getTime() ?? now - MAX_LOOKBACK_MS, now - MAX_LOOKBACK_MS));
    const dueFrom = parseDate(searchParams.get('dueFrom'));
    const dueTo = parseDate(searchParams.get('dueTo'));

    const jia = await prisma.user.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' }, organizationId: auth.organizationId, isActive: true },
      select: { id: true, name: true },
    });
    if (!jia) return errorResponse('이 조직에서 해당 사용자를 찾을 수 없습니다.', 404, 'NOT_FOUND');

    const scope: Record<string, unknown> = { organizationId: auth.organizationId };
    if (auth.allowedProjectIds !== null) scope.projectId = { in: auth.allowedProjectIds.length ? auth.allowedProjectIds : [-1] };
    const byJia = { OR: [{ authorId: jia.id }, { source: 'JIA', serviceCredentialId: auth.credential.id }] };
    const participates = {
      ...scope,
      OR: [
        { workerId: jia.id },
        { registrantId: jia.id },
        { comments: { some: { content: { contains: `](${jia.id})` } } } },
        { comments: { some: byJia } },
      ],
    };

    const [incoming, due] = await Promise.all([
      prisma.taskComment.findMany({
        where: {
          createdAt: { gte: since },
          task: participates,
          NOT: byJia,
          OR: [{ content: { contains: `](${jia.id})` } }, { parent: byJia }],
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_ITEMS,
        select: {
          id: true, parentId: true, content: true, createdAt: true, source: true, externalAuthorLabel: true,
          author: { select: { id: true, name: true, role: true } },
          task: { select: { id: true, title: true, status: true, targetDate: true, projectId: true, project: { select: { name: true } }, worker: { select: { id: true, name: true } } } },
        },
      }),
      dueFrom && dueTo
        ? prisma.task.findMany({
            where: { ...participates, targetDate: { gte: dueFrom, lt: dueTo }, NOT: { workerId: jia.id } },
            take: MAX_ITEMS,
            select: {
              id: true, title: true, status: true, targetDate: true, updatedAt: true, projectId: true,
              project: { select: { name: true } },
              worker: { select: { id: true, name: true, role: true } },
              registrant: { select: { id: true, name: true } },
              histories: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // 프로젝트별 완료 상태 코드(커스텀 상태 포함)
    const doneCodes = new Map<number | null, Set<string>>();
    const isDone = async (projectId: number | null, status: string) => {
      if (!doneCodes.has(projectId)) {
        doneCodes.set(projectId, new Set((await getProjectStatuses(projectId)).filter((s) => s.isDone).map((s) => s.code)));
      }
      return doneCodes.get(projectId)!.has(status);
    };

    // 각 메시지의 업무 맥락: 그 댓글까지의 최근 댓글 몇 개
    const threads = new Map<number, { author: string; at: Date; text: string; byJia: boolean }[]>();
    for (const taskId of Array.from(new Set(incoming.map((c) => c.task.id)))) {
      const rows = await prisma.taskComment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { createdAt: true, content: true, source: true, externalAuthorLabel: true, authorId: true, serviceCredentialId: true, author: { select: { name: true } } },
      });
      threads.set(taskId, rows.reverse().map((r) => ({
        author: r.author?.name ?? r.externalAuthorLabel ?? 'JIA',
        at: r.createdAt,
        text: plain(r.content, 300),
        byJia: r.authorId === jia.id || (r.source === 'JIA' && r.serviceCredentialId === auth.credential.id),
      })));
    }

    const messages = incoming.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      createdAt: c.createdAt,
      authorName: c.author?.name ?? c.externalAuthorLabel ?? '알 수 없음',
      authorRole: c.author?.role ?? null,
      text: plain(c.content),
      mentionsJia: c.content.includes(`](${jia.id})`),
      task: { id: c.task.id, title: c.task.title, status: c.task.status, targetDate: c.task.targetDate, projectName: c.task.project?.name ?? null, workerName: c.task.worker?.name ?? null },
      thread: (threads.get(c.task.id) ?? []).filter((t) => t.at <= c.createdAt).slice(-THREAD_COMMENTS),
    }));

    const dueTasks = [];
    for (const t of due) {
      if (await isDone(t.projectId, t.status)) continue;
      dueTasks.push({
        id: t.id, title: t.title, status: t.status, targetDate: t.targetDate, updatedAt: t.updatedAt,
        lastHistoryAt: t.histories[0]?.createdAt ?? null,
        projectName: t.project?.name ?? null,
        worker: { id: t.worker.id, name: t.worker.name, role: t.worker.role },
        registrantName: t.registrant?.name ?? null,
      });
    }

    return successResponse({ user: jia, since: since.toISOString(), serverTime: new Date(now).toISOString(), messages, dueTasks });
  } catch (error) {
    console.error('Jia activity error:', error);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
