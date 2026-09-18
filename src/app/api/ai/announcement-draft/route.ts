import { NextRequest } from 'next/server';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';

// POST /api/ai/announcement-draft - 공지사항 초안 작성(ADMIN/LEADER, 결과는 저장하지 않고 폼에 채워 넣기용)
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN', 'LEADER']);
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'announcementDraft'))) {
      return errorResponse('AI 공지 초안 작성 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }
    const providerInfo = await getFeatureProvider(organizationId, 'announcementDraft');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const points: string = (body.points || '').trim();
    if (!points) return errorResponse('공지에 담을 핵심 내용을 입력해주세요.', 400, 'VALID_400');

    const prompt = `다음 핵심 내용을 바탕으로 사내 공지사항 문구 초안을 작성하라. 정중하고 간결한 한국어 공지 톤으로, 3~5문장 이내. 핵심 내용에 없는 사실을 지어내지 마라.

[핵심 내용]
${points}`;

    const draft = await callLLM(providerInfo.provider, prompt, 512, providerInfo.apiKey);
    return successResponse({ draft }, 'AI 공지 초안 작성 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 공지 초안 작성 중 오류가 발생했습니다.', 500);
  }
}
