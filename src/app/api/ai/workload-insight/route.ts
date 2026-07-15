import { NextRequest } from 'next/server';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { computeWorkloadStats } from '@/lib/workload';
import { callClaude } from '@/lib/ai';
import { getOrgAnthropicKey, isFeatureEnabled } from '@/lib/ai-settings';

// POST /api/ai/workload-insight - 담당자별 업무 부하 AI 인사이트 (ADMIN/LEADER)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'workloadInsight'))) {
      return errorResponse('AI 업무 부하 분석 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) return errorResponse('Anthropic API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    const workload = await computeWorkloadStats(organizationId, from, to);
    if (workload.length === 0) {
      return successResponse({ insight: '분석할 담당자 데이터가 없습니다.' });
    }

    const lines = workload
      .map((w) => `- ${w.name}: 전체 ${w.totalTasks}건 (진행중 ${w.inProgressTasks}건, 완료 ${w.completedTasks}건), 누적 ${w.totalHours}시간, 업무당 평균 ${w.averageHoursPerTask}시간`)
      .join('\n');

    const prompt = `다음은 팀원별 업무 부하 데이터다. 과부하가 의심되는 인원, 여유가 있는 인원, 재배정이 필요해 보이는 부분을 짚어 한국어로 3~5문장의 간결한 인사이트를 작성하라. 수치를 임의로 지어내지 말고 주어진 데이터만 근거로 삼아라.

${lines}`;

    const insight = await callClaude(prompt, 512, apiKey);

    return successResponse({ insight }, 'AI 부하 분석 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 부하 분석 중 오류가 발생했습니다.', 500);
  }
}
