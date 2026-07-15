import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callClaude } from '@/lib/ai';
import { getOrgAnthropicKey, isFeatureEnabled } from '@/lib/ai-settings';
import { TASK_LABEL_LIST } from '@/lib/constants';

// POST /api/ai/task-draft - 업무 제목만으로 상세내용 초안 + 라벨 추천 생성
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'taskDraft'))) {
      return errorResponse('AI 업무 생성 보조 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }

    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) return errorResponse('Anthropic API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const { title, projectContext } = body as { title?: string; projectContext?: string };
    if (!title?.trim()) return errorResponse('업무 제목을 입력해주세요.', 400, 'VALID_400');

    const prompt = `업무 관리 도구에서 아래 제목의 업무를 등록하려 한다. 업무 상세내용 초안과 라벨을 아래 JSON 형식으로만 응답하라(다른 설명 없이 JSON만 출력):
{
  "notes": "업무 상세내용 초안 (2~4문장, 존댓말, 업무 목적/범위/체크포인트 위주)",
  "suggestedLabels": ["${TASK_LABEL_LIST.join('", "')}" 중 해당하는 것만, 없으면 빈 배열]
}

업무 제목: ${title.trim()}
${projectContext ? `프로젝트 컨텍스트: ${projectContext}` : ''}`;

    const raw = await callClaude(prompt, 512, apiKey);
    let notes = '';
    let suggestedLabels: string[] = [];
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      notes = typeof parsed.notes === 'string' ? parsed.notes : '';
      suggestedLabels = Array.isArray(parsed.suggestedLabels)
        ? parsed.suggestedLabels.filter((l: unknown) => typeof l === 'string' && TASK_LABEL_LIST.includes(l))
        : [];
    } catch {
      notes = raw;
    }

    return successResponse({ notes, suggestedLabels }, 'AI 업무 초안 생성 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 업무 초안 생성 중 오류가 발생했습니다.', 500);
  }
}
