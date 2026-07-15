import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { callClaude } from '@/lib/ai';
import { getOrgAnthropicKey, isFeatureEnabled } from '@/lib/ai-settings';
import { computeWorkloadStats } from '@/lib/workload';

// POST /api/ai/weekly-report - 이번 주 완료/진행 업무 + 팀별 공수 기반 AI 주간 보고서 (ADMIN/LEADER)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'weeklyReport'))) {
      return errorResponse('AI 주간 보고서 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) return errorResponse('Anthropic API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json().catch(() => ({}));
    const weekStart = body.weekStart ? new Date(body.weekStart) : new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [completedTasks, inProgressTasks, workload] = await Promise.all([
      prisma.task.findMany({
        where: { organizationId, status: 'DONE', updatedAt: { gte: weekStart, lte: weekEnd } },
        select: { title: true, worker: { select: { name: true } } },
        take: 100,
      }),
      prisma.task.findMany({
        where: { organizationId, status: { not: 'DONE' }, updatedAt: { gte: weekStart, lte: weekEnd } },
        select: { title: true, status: true, worker: { select: { name: true } } },
        take: 100,
      }),
      computeWorkloadStats(organizationId, weekStart, weekEnd),
    ]);

    const completedLines = completedTasks.map((t) => `- ${t.title} (${t.worker?.name ?? '미배정'})`).join('\n');
    const progressLines = inProgressTasks.map((t) => `- [${t.status}] ${t.title} (${t.worker?.name ?? '미배정'})`).join('\n');
    const hoursLines = workload
      .filter((w) => w.totalTasks > 0 || w.totalHours > 0)
      .map((w) => `- ${w.name}: ${w.totalTasks}건 (완료 ${w.completedTasks}), ${w.totalHours}시간`)
      .join('\n');

    const prompt = `아래는 한 팀의 이번 주(${weekStart.toISOString().slice(0, 10)} ~ ${weekEnd.toISOString().slice(0, 10)}) 업무 현황이다. 팀 리더나 경영진이 보고 받을 수 있는 한국어 주간 보고서를 작성하라. "완료 업무", "진행 중 업무", "팀별 공수" 섹션으로 나누고 각 섹션은 간결한 불릿으로 정리하되, 마지막에 전체 총평 2~3문장을 추가하라. 수치를 임의로 지어내지 말고 주어진 데이터만 근거로 삼아라.

[완료 업무]
${completedLines || '(없음)'}

[진행 중 업무]
${progressLines || '(없음)'}

[팀별 공수]
${hoursLines || '(데이터 없음)'}`;

    const report = await callClaude(prompt, 1024, apiKey);

    return successResponse({ report, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() }, 'AI 주간 보고서 생성 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 주간 보고서 생성 중 오류가 발생했습니다.', 500);
  }
}
