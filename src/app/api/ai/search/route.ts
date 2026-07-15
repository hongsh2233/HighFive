import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callClaude } from '@/lib/ai';
import { getOrgAnthropicKey, isFeatureEnabled } from '@/lib/ai-settings';
import { runSearch } from '@/lib/search';

// POST /api/ai/search - 자연어 질의에서 검색 키워드를 추출해 기존 검색을 재활용
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'aiSearch'))) {
      return errorResponse('AI 자연어 검색 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) return errorResponse('Anthropic API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const query: string = (body.query || '').trim();
    if (!query) return errorResponse('검색어를 입력해주세요.', 400, 'VALID_400');

    const prompt = `사용자가 업무관리 도구에서 자연어로 검색을 요청했다. 이 문장에서 실제로 데이터베이스 검색에 쓸 핵심 키워드(제목/내용에 포함될 만한 단어나 짧은 구)를 하나만 추출하라. 다른 설명 없이 키워드 문자열만 출력하라(따옴표 없이).

검색 요청: ${query}`;

    const keyword = (await callClaude(prompt, 64, apiKey)).trim().replace(/^["']|["']$/g, '');
    const results = await runSearch(organizationId, keyword || query);

    return successResponse({ keyword: keyword || query, ...results }, 'AI 검색 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 검색 중 오류가 발생했습니다.', 500);
  }
}
