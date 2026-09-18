import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';

const MAX_INPUT_CHARS = 8000;

// POST /api/ai/summarize-text - 문의 내용/댓글 스레드 등 임의 텍스트 요약 (결과는 저장하지 않음)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'inquiryCommentSummary'))) {
      return errorResponse('AI 요약 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }
    const providerInfo = await getFeatureProvider(organizationId, 'inquiryCommentSummary');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const text: string = (body.text || '').trim();
    const label: string = body.label || '내용';
    if (!text) return errorResponse('요약할 내용이 없습니다.', 400, 'VALID_400');

    const prompt = `다음은 ${label}이다. 핵심만 2~3문장으로 한국어로 요약하라. 없는 사실을 지어내지 마라.

${text.slice(0, MAX_INPUT_CHARS)}`;

    const summary = await callLLM(providerInfo.provider, prompt, 384, providerInfo.apiKey);
    return successResponse({ summary }, 'AI 요약 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 요약 중 오류가 발생했습니다.', 500);
  }
}
