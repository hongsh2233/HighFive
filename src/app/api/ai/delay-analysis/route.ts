import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// POST /api/ai/delay-analysis - 지연 업무 원인 분석(ADMIN/LEADER, 결과는 저장하지 않음)
export async function POST() {
  try {
    const { error, organizationId, session } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'delayAnalysis'))) {
      return errorResponse('AI 지연 원인 분석 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }
    const providerInfo = await getFeatureProvider(organizationId, 'delayAnalysis');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const role = (session!.user as any).role;
    const userId = parseInt((session!.user as any).id || '0');
    const today = startOfDay(new Date());

    const scopeWhere = role === 'ADMIN'
      ? { organizationId }
      : { organizationId, project: { members: { some: { userId } } } };

    const overdue = await prisma.task.findMany({
      where: { ...scopeWhere, isGroup: false, status: { not: 'DONE' }, targetDate: { lt: today } },
      select: { title: true, status: true, targetDate: true, worker: { select: { name: true } }, project: { select: { name: true } } },
      take: 50,
    });

    if (overdue.length === 0) {
      return successResponse({ analysis: '현재 지연 중인 업무가 없습니다.' }, 'AI 지연 원인 분석 완료');
    }

    const lines = overdue.map((t) => `- [${t.project?.name ?? '미지정'}] ${t.title} (담당 ${t.worker?.name ?? '미배정'}, 목표일 ${t.targetDate?.toISOString().slice(0, 10)}, 상태 ${t.status})`).join('\n');

    const prompt = `아래는 지연 중인 업무 목록이다. 이 목록만 보고 경향(특정 담당자/프로젝트/상태 단계에 몰려있는지)을 분석하고, 확실하지 않은 지연 "원인"은 단정하지 말고 가능성 있는 가설로만 2~3개 제시하라. 데이터에 없는 사실을 지어내지 말고, 모르는 것은 "확인 필요"라고 명시하라. 한국어로 5문장 이내.

[지연 업무 목록]
${lines}`;

    const analysis = await callLLM(providerInfo.provider, prompt, 512, providerInfo.apiKey);
    return successResponse({ analysis, count: overdue.length }, 'AI 지연 원인 분석 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 지연 원인 분석 중 오류가 발생했습니다.', 500);
  }
}
