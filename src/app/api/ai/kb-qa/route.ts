import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { callLLM } from '@/lib/ai';
import { getFeatureProvider, isFeatureEnabled } from '@/lib/ai-settings';
import { runSearch } from '@/lib/search';
import { prisma } from '@/lib/db';

// POST /api/ai/kb-qa - 지식베이스(위키/정보) 질의응답. 검색으로 관련 문서를 찾아 그 내용을 근거로만 답한다.
export async function POST(req: NextRequest) {
  try {
    const { error, organizationId, session } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'kbQA'))) {
      return errorResponse('AI 지식베이스 질의응답 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.', 403, 'AI_DISABLED');
    }
    const providerInfo = await getFeatureProvider(organizationId, 'kbQA');
    if (!providerInfo) return errorResponse('API 키가 설정되지 않았습니다.', 400, 'AI_KEY_MISSING');

    const body = await req.json();
    const question: string = (body.question || '').trim();
    if (!question) return errorResponse('질문을 입력해주세요.', 400, 'VALID_400');

    const userId = parseInt((session!.user as any).id || '0');
    const role = (session!.user as any).role;

    const { wiki } = await runSearch(organizationId, question, { userId, role }, { types: ['wiki'] });

    // 위키가 비활성화된 조직(정보/FAQ 모드)은 InfoItem에서도 찾아본다
    const infoItems = await prisma.infoItem.findMany({
      where: {
        isActive: true,
        OR: [{ question: { contains: question, mode: 'insensitive' } }, { answer: { contains: question, mode: 'insensitive' } }],
      },
      select: { question: true, answer: true },
      take: 5,
    });

    if (wiki.length === 0 && infoItems.length === 0) {
      return successResponse({ answer: '관련된 지식베이스 문서를 찾지 못했습니다. 질문을 조금 더 구체적으로 입력해보세요.', sources: [] }, 'AI 질의응답 완료');
    }

    const wikiFull = wiki.length
      ? await prisma.wikiPage.findMany({ where: { id: { in: wiki.map((w) => w.id) } }, select: { id: true, title: true, content: true } })
      : [];

    const context = [
      ...wikiFull.map((w) => `[위키: ${w.title}]\n${w.content.slice(0, 1500)}`),
      ...infoItems.map((i) => `[FAQ: ${i.question}]\n${i.answer.slice(0, 1000)}`),
    ].join('\n\n---\n\n');

    const prompt = `아래 사내 지식베이스 문서들을 근거로 질문에 답하라. 문서에 없는 내용은 "문서에서 확인할 수 없습니다"라고 답하고 추측하지 마라. 한국어로 간결하게 답하라.

[질문]
${question}

[관련 문서]
${context}`;

    const answer = await callLLM(providerInfo.provider, prompt, 768, providerInfo.apiKey);
    return successResponse({
      answer,
      sources: [...wikiFull.map((w) => ({ type: 'wiki', title: w.title })), ...infoItems.map((i) => ({ type: 'faq', title: i.question }))],
    }, 'AI 질의응답 완료');
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || 'AI 질의응답 중 오류가 발생했습니다.', 500);
  }
}
