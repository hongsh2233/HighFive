import { prisma } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// POST /api/ai/daily-briefing - 오늘의 업무 브리핑 (본인 업무 기준, 결과는 저장하지 않고 화면에만 표시)
export async function POST() {
  try {
    const { error, organizationId, session } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'dailyBriefing'))) {
      return errorResponse('AI 업무 브리핑 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }
    const providerInfo = await getFeatureProvider(organizationId, 'dailyBriefing');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const userId = parseInt((session!.user as any).id || '0');
    const today = startOfDay(new Date());

    const tasks = await prisma.task.findMany({
      where: { organizationId, workerId: userId, isGroup: false, status: { not: 'DONE' } },
      select: { title: true, status: true, targetDate: true },
      take: 50,
    });

    const dueToday = tasks.filter((t) => t.targetDate && startOfDay(t.targetDate).getTime() === today.getTime());
    const overdue = tasks.filter((t) => t.targetDate && startOfDay(t.targetDate) < today);
    const others = tasks.filter((t) => !dueToday.includes(t) && !overdue.includes(t));

    const lines = (arr: typeof tasks) => arr.map((t) => `- [${t.status}] ${t.title}${t.targetDate ? ` (목표일 ${t.targetDate.toISOString().slice(0, 10)})` : ''}`).join('\n') || '(없음)';

    const prompt = `아래는 한 팀원의 오늘 기준 업무 현황이다. 이 사람이 출근해서 바로 읽을 3~5줄짜리 간단한 한국어 브리핑을 작성하라. 격식 없이 친근하게, 오늘 뭘 먼저 해야 하는지 우선순위 관점으로 정리하라. 데이터에 없는 내용을 지어내지 마라.

[오늘 마감]
${lines(dueToday)}

[지연중]
${lines(overdue)}

[기타 진행중]
${lines(others)}`;

    const briefing = await callLLM(providerInfo.provider, prompt, 512, providerInfo.apiKey);
    return successResponse({ briefing }, 'AI 브리핑 생성 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 브리핑 생성 중 오류가 발생했습니다.', 500);
  }
}
