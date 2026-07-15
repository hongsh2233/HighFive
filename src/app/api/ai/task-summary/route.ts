import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callClaude } from '@/lib/ai';
import { getOrgAnthropicKey, isFeatureEnabled } from '@/lib/ai-settings';

// POST /api/ai/task-summary - 업무 히스토리+댓글 기반 현황 요약
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'taskSummary'))) {
      return errorResponse('AI 업무 요약 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) return errorResponse('Anthropic API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const taskId = parseInt(body.taskId);
    if (isNaN(taskId)) return errorResponse('유효하지 않은 업무 ID입니다.', 400, 'VALID_400');

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
      select: {
        title: true,
        status: true,
        notes: true,
        worker: { select: { name: true } },
        registrant: { select: { name: true } },
      },
    });
    if (!task) return errorResponse('업무를 찾을 수 없습니다.', 404);

    const [histories, comments] = await Promise.all([
      prisma.taskHistory.findMany({
        where: { taskId },
        select: { action: true, detail: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.taskComment.findMany({
        where: { taskId },
        select: { content: true, createdAt: true, author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const notesText = (task.notes || '').replace(/<[^>]+>/g, ' ').trim();
    const historyLines = histories
      .map((h) => `- [${h.createdAt.toISOString().slice(0, 10)}] ${h.user.name}: ${h.action}${h.detail ? ` — ${h.detail}` : ''}`)
      .join('\n');
    const commentLines = comments
      .map((c) => `- [${c.createdAt.toISOString().slice(0, 10)}] ${c.author.name}: ${c.content}`)
      .join('\n');

    const prompt = `아래는 업무관리 도구의 업무 하나에 대한 정보다. 현재 상태와 진행 흐름을 파악할 수 있도록 한국어로 3~5문장의 간결한 현황 요약을 작성하라. 특이사항(지연, 반복된 이슈, 의견 충돌 등)이 있으면 짚어줘.

업무 제목: ${task.title}
현재 상태: ${task.status}
담당자: ${task.worker?.name ?? '미배정'} / 등록자: ${task.registrant?.name ?? '-'}
비고: ${notesText || '(없음)'}

[최근 히스토리]
${historyLines || '(없음)'}

[최근 댓글]
${commentLines || '(없음)'}`;

    const summary = await callClaude(prompt, 512, apiKey);
    return successResponse({ summary }, 'AI 요약 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 업무 요약 중 오류가 발생했습니다.', 500);
  }
}
